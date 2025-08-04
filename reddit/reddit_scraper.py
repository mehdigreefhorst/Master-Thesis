
import requests
from typing import Optional
class RedditScraper:
    """The system that calls the reddit API with the correct information"""

    @staticmethod
    def search(subreddit: str, query: str, age: str, filter: Optional[str] = ""):
        """
        subreddit = "deaf"; // subreddit name goes here
        filter = "top"; // filter options are(new, hot, top, rising)
        top = highest upvotes

        Hot = highest upvotes/time
        age = "all"; // options are(hour, day, week, month, year, all)
        """
        query = query.replace(" ", "+")

        response = requests.get(f"https://www.reddit.com/r/{subreddit}/{filter}?search={query}/.json?t=${age}")
