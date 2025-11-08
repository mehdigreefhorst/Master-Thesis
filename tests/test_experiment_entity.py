"""Tests for ExperimentEntity"""
import pytest
from app.database.entities.experiment_entity import (
    ExperimentEntity,
    PredictionResult,
    AggregateResult,
)


def test_experiment_entity_creation():
    """Test creating an ExperimentEntity"""
    experiment = ExperimentEntity(
        user_id="507f1f77bcf86cd799439011",
        scraper_cluster_id="507f1f77bcf86cd799439012",
        prompt_id="507f1f77bcf86cd799439013",
        sample_id="507f1f77bcf86cd799439014",
        model="gpt-4"
    )

    print(experiment)


    assert experiment.model == "gpt-4"
    assert experiment.runs_per_unit == 3
    assert isinstance(experiment.aggregate_result, AggregateResult)


def test_prediction_result_defaults():
    """Test PredictionResult default values"""
    result = PredictionResult()

    assert result.prevelance_dict == {}
    assert result.sum_ground_truth == 0


def test_aggregate_result_defaults():
    """Test AggregateResult has all label fields"""
    aggregate = AggregateResult()

    assert isinstance(aggregate.problem_description, PredictionResult)
    assert isinstance(aggregate.frustration_expression, PredictionResult)
    assert isinstance(aggregate.solution_seeking, PredictionResult)
    assert isinstance(aggregate.solution_attempted, PredictionResult)
    assert isinstance(aggregate.solution_proposing, PredictionResult)
    assert isinstance(aggregate.agreement_empathy, PredictionResult)
    assert isinstance(aggregate.none_of_the_above, PredictionResult)


def test_experiment_with_custom_aggregate():
    """Test creating experiment with custom aggregate results"""
    custom_aggregate = AggregateResult(
        problem_description=PredictionResult(
            prevelance_dict={"3": 120, "2": 40, "1": 10, "0": 100},  # Keys must be strings
            sum_ground_truth=150
        )
    )

    experiment = ExperimentEntity(
        user_id="507f1f77bcf86cd799439011",
        scraper_cluster_id="507f1f77bcf86cd799439012",
        prompt_id="507f1f77bcf86cd799439013",
        sample_id="507f1f77bcf86cd799439014",
        model="claude-3",
        reasoning_effort="high",
        aggregate_result=custom_aggregate,
        runs_per_unit=5
    )

    assert experiment.reasoning_effort == "high"
    assert experiment.runs_per_unit == 5
    assert experiment.aggregate_result.problem_description.sum_ground_truth == 150
    assert experiment.aggregate_result.problem_description.prevelance_dict["3"] == 120


def test_prevalence_dict_validates_numeric_keys():
    """Test that prevelance_dict only accepts numeric string keys"""
    import pytest

    # Should work with numeric strings
    valid_result = PredictionResult(
        prevelance_dict={"0": 5, "1": 10, "2": 15}
    )
    assert valid_result.prevelance_dict["0"] == 5

    # Should fail with non-numeric strings
    with pytest.raises(ValueError, match="Dictionary keys must be numeric strings"):
        PredictionResult(
            prevelance_dict={"invalid": 5, "0": 10}
        )
