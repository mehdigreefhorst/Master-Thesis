"""
Service for handling actions on filtered cluster units:
1. Extract standalone statements and cluster with BERTopic
2. LLM-based category prediction clustering
"""

from typing import List, Dict, Any
from app.database.entities.cluster_unit_entity import ClusterUnitEntity
from app.database.entities.base_entity import PyObjectId


class FilterActionsService:
    """
    Service for performing actions on filtered cluster units
    """

    @staticmethod
    def extract_standalone_statements(
        cluster_units: List[ClusterUnitEntity],
        statement_type: str = "both"
    ) -> List[Dict[str, Any]]:
        """
        Extract standalone problem/solution statements from cluster units

        Args:
            cluster_units: List of cluster units to process
            statement_type: "problems", "solutions", or "both"

        Returns:
            List of extracted statements with metadata
        """
        statements = []

        for unit in cluster_units:
            # For now, we'll use the text directly
            # In the future, this can be enhanced with LLM-based extraction
            if statement_type in ["both", "problems"]:
                # Check if unit has problem-related ground truth labels
                if unit.ground_truth:
                    if (unit.ground_truth.problem_description or
                        unit.ground_truth.frustration_expression or
                        unit.ground_truth.solution_seeking):
                        statements.append({
                            "cluster_unit_id": str(unit.id),
                            "text": unit.text,
                            "type": "problem",
                            "subreddit": unit.subreddit,
                            "upvotes": unit.upvotes,
                            "author": unit.author
                        })

            if statement_type in ["both", "solutions"]:
                # Check if unit has solution-related ground truth labels
                if unit.ground_truth:
                    if (unit.ground_truth.solution_attempted or
                        unit.ground_truth.solution_proposing):
                        statements.append({
                            "cluster_unit_id": str(unit.id),
                            "text": unit.text,
                            "type": "solution",
                            "subreddit": unit.subreddit,
                            "upvotes": unit.upvotes,
                            "author": unit.author
                        })

        return statements

    @staticmethod
    def cluster_with_bertopic(
        statements: List[Dict[str, Any]],
        min_topic_size: int = 5,
        nr_topics: Any = "auto"
    ) -> Dict[str, Any]:
        """
        Cluster statements using BERTopic

        Args:
            statements: List of statements to cluster
            min_topic_size: Minimum size for a topic
            nr_topics: Number of topics ("auto" or specific number)

        Returns:
            Dictionary with clustering results
        """
        try:
            from bertopic import BERTopic
            from sentence_transformers import SentenceTransformer

            # Extract texts for clustering
            texts = [stmt["text"] for stmt in statements]

            if len(texts) < min_topic_size:
                return {
                    "success": False,
                    "error": f"Not enough statements to cluster. Minimum required: {min_topic_size}, provided: {len(texts)}"
                }

            # Initialize BERTopic
            # Using sentence-transformers for embeddings
            embedding_model = SentenceTransformer("all-MiniLM-L6-v2")

            topic_model = BERTopic(
                embedding_model=embedding_model,
                min_topic_size=min_topic_size,
                nr_topics=nr_topics if nr_topics != "auto" else None,
                calculate_probabilities=True
            )

            # Fit the model
            topics, probs = topic_model.fit_transform(texts)

            # Get topic info
            topic_info = topic_model.get_topic_info()

            # Attach topic assignments to statements
            for i, stmt in enumerate(statements):
                stmt["topic"] = int(topics[i])
                stmt["topic_probability"] = float(probs[i])

            return {
                "success": True,
                "statements": statements,
                "topic_info": topic_info.to_dict(),
                "num_topics": len(set(topics)) - (1 if -1 in topics else 0),  # Exclude outlier topic
                "num_outliers": sum(1 for t in topics if t == -1)
            }

        except ImportError:
            return {
                "success": False,
                "error": "BERTopic or sentence-transformers not installed. Please install: pip install bertopic sentence-transformers"
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Error during clustering: {str(e)}"
            }

    @staticmethod
    def cluster_by_llm_categories(
        cluster_units: List[ClusterUnitEntity],
        experiment_id: PyObjectId,
        categories_to_cluster: List[str] = None
    ) -> Dict[str, Any]:
        """
        Cluster units based on LLM predicted categories

        Args:
            cluster_units: List of cluster units with predictions
            experiment_id: Experiment ID to use for predictions
            categories_to_cluster: Specific categories to cluster by (None = all)

        Returns:
            Dictionary with clustering results organized by category
        """
        if categories_to_cluster is None:
            categories_to_cluster = [
                "problem_description",
                "frustration_expression",
                "solution_seeking",
                "solution_attempted",
                "solution_proposing",
                "agreement_empathy"
            ]

        # Group units by predicted categories
        category_clusters = {category: [] for category in categories_to_cluster}
        units_without_predictions = []

        experiment_id_str = str(experiment_id)

        for unit in cluster_units:
            # Check if unit has predictions for this experiment
            if not unit.predicted_category or experiment_id_str not in unit.predicted_category:
                units_without_predictions.append({
                    "cluster_unit_id": str(unit.id),
                    "text": unit.text,
                    "subreddit": unit.subreddit,
                    "author": unit.author,
                    "upvotes": unit.upvotes
                })
                continue

            predictions = unit.predicted_category[experiment_id_str]

            # Add unit to all categories where it was predicted true
            for category in categories_to_cluster:
                if hasattr(predictions, category) and getattr(predictions, category):
                    category_clusters[category].append({
                        "cluster_unit_id": str(unit.id),
                        "text": unit.text,
                        "subreddit": unit.subreddit,
                        "author": unit.author,
                        "upvotes": unit.upvotes,
                        "predicted_categories": [
                            cat for cat in categories_to_cluster
                            if hasattr(predictions, cat) and getattr(predictions, cat)
                        ]
                    })

        # Calculate statistics
        total_units = len(cluster_units)
        units_with_predictions = total_units - len(units_without_predictions)

        category_counts = {
            category: len(units)
            for category, units in category_clusters.items()
        }

        return {
            "success": True,
            "category_clusters": category_clusters,
            "category_counts": category_counts,
            "total_units": total_units,
            "units_with_predictions": units_with_predictions,
            "units_without_predictions": units_without_predictions,
            "experiment_id": experiment_id_str
        }

    @staticmethod
    def cluster_by_semantic_similarity(
        cluster_units: List[ClusterUnitEntity],
        min_cluster_size: int = 5
    ) -> Dict[str, Any]:
        """
        Cluster units based on semantic similarity using embeddings

        Args:
            cluster_units: List of cluster units to cluster
            min_cluster_size: Minimum cluster size

        Returns:
            Dictionary with clustering results
        """
        try:
            from sentence_transformers import SentenceTransformer
            from sklearn.cluster import HDBSCAN
            import numpy as np

            # Extract texts
            texts = [unit.text for unit in cluster_units]

            if len(texts) < min_cluster_size:
                return {
                    "success": False,
                    "error": f"Not enough units to cluster. Minimum required: {min_cluster_size}, provided: {len(texts)}"
                }

            # Generate embeddings
            embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
            embeddings = embedding_model.encode(texts)

            # Cluster using HDBSCAN
            clusterer = HDBSCAN(min_cluster_size=min_cluster_size)
            cluster_labels = clusterer.fit_predict(embeddings)

            # Organize results
            clusters = {}
            for i, label in enumerate(cluster_labels):
                label = int(label)
                if label not in clusters:
                    clusters[label] = []

                clusters[label].append({
                    "cluster_unit_id": str(cluster_units[i].id),
                    "text": cluster_units[i].text,
                    "subreddit": cluster_units[i].subreddit,
                    "author": cluster_units[i].author,
                    "upvotes": cluster_units[i].upvotes
                })

            num_clusters = len([k for k in clusters.keys() if k != -1])
            num_outliers = len(clusters.get(-1, []))

            return {
                "success": True,
                "clusters": clusters,
                "num_clusters": num_clusters,
                "num_outliers": num_outliers,
                "total_units": len(cluster_units)
            }

        except ImportError:
            return {
                "success": False,
                "error": "Required packages not installed. Please install: pip install sentence-transformers scikit-learn hdbscan"
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Error during clustering: {str(e)}"
            }
