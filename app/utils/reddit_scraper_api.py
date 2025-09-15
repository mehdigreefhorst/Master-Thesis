# utils/reddit_scraper_api.py
from __future__ import annotations # needed so that we can use the nested structure of replies
from enum import Enum
import json
import os
import time
from pydantic import BaseModel
import requests
from typing import List, Literal, Optional, Tuple
from dotenv import load_dotenv
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from app.responses.reddit_post_comments_response import RedditComment, RedditPost, RedditResponse

load_dotenv()



class RedditScraperAPI:
    """The system that calls the reddit API with the correct information"""
    def __init__(self):
        REDDIT_SECRET_KEY = os.getenv("REDDIT_SECRET_KEY")
        CLIENT_ID = os.getenv("CLIENT_ID")
        
        self.auth = requests.auth.HTTPBasicAuth(CLIENT_ID,REDDIT_SECRET_KEY)
        self.headers = self.get_requests_headers_bearer()
    
    def get_requests_headers_bearer(self):
        login_data = {
            'grant_type' : 'password',
            'username' : os.getenv("REDDIT_USERNAME"),
            'password' : os.getenv("REDDIT_PASSWORD")
        }
        headers = {'User-Agent': 'DeafHHApp/0.0.1'}
        REDDIT_SECRET_KEY = os.getenv("REDDIT_SECRET_KEY")
        CLIENT_ID = os.getenv("CLIENT_ID")
        auth = requests.auth.HTTPBasicAuth(CLIENT_ID,REDDIT_SECRET_KEY)
        response = requests.post('https://www.reddit.com/api/v1/access_token',auth=auth,data=login_data, headers=headers)
        
        print("response = \n", response.json())
        token = response.json()['access_token']
        headers = {**headers, **{'Authorization': f'bearer {token}'}}
        return headers        


    def search(self, 
               subreddit: str, 
               query: str, 
               age: Literal["hour", "day", "week", "month", "year", "all"] = "all", 
               limit= 25, 
               filter: Literal["new", "hot", "top", "rising"] = "top"
               ) -> List[RedditPost]:
        """
        subreddit = "deaf"; // subreddit name goes here
        query = what should be added in the reddit search bar
        filter = "top"; // filter options are(new, hot, top, rising)
        top = highest upvotes

        Hot = highest upvotes/time
        age = "all"; // options are(hour, day, week, month, year, all)
        ---
        Search posts in a subreddit using Reddit's OAuth API.
        """
        url = f"https://oauth.reddit.com/r/{subreddit}/search"
        params = {
            "q": query,          # the actual search query
            "restrict_sr": 1,    # search within this subreddit only
            "limit": limit,
            "sort": filter,      # 'new' | 'hot' | 'top' | 'rising'
            "t": age,            # hour/day/week/month/year/all (used with 'top')
            "type": "link",      # optional: only posts (exclude comments)
        }

        response = requests.get(url, headers=self.headers, params=params)
        response.raise_for_status()  # surface HTTP errors early

        data = response.json()
        return RedditResponse.model_validate(data).get_posts()
    
    def search_comments(self, permalink: str) -> List[RedditComment]:
        # Remove leading slash if present
        if permalink.startswith('/'):
            permalink = permalink[1:]
        response = requests.get(f"https://oauth.reddit.com/{permalink}", headers=self.headers, params={'limit': 100})
        response.raise_for_status()
        response_data = response.json()
        full_submission_post =  response_data[0] # this is the post of the permalink that is connected to it, it is exactly the same as the post
        post = RedditResponse.model_validate(full_submission_post)
        comments_data = response_data[1]
        print(f"Fetching comments for permalink: {permalink}")
        print(comments_data.keys())
        with open("data/comments_result.json", "w") as f:
            f.write(json.dumps(comments_data, indent=4))
        
         # Parse comments and handle 'more' recursively
        comments = self._process_comments_recursively(comments_data, permalink)
        #return RedditResponse.model_validate(comments).get_comments()
        return comments
    def _fetch_more_comments(self, comment_ids: List[str], base_permalink: str, 
                           parent_id: str = None, limit: int = 100) -> List[RedditComment]:
        """
        Fetch additional comments using the /api/morechildren endpoint.
        """
        if not comment_ids:
            return []
        
        # Reddit API has a limit on how many IDs can be fetched at once
        batch_size = 100
        all_comments = []
        
        for i in range(0, len(comment_ids), batch_size):
            batch_ids = comment_ids[i:i + batch_size]
            
            # Use the morechildren API endpoint
            url = "https://oauth.reddit.com/api/morechildren"
            params = {
                'api_type': 'json',
                'children': ','.join(batch_ids),
                'link_id': self._extract_link_id(base_permalink),
                'limit': limit,
                'sort': 'best'
            }
            
            try:
                response = requests.get(url, headers=self.headers, params=params)
                response.raise_for_status()
                
                data = response.json()
                if 'json' in data and 'data' in data['json']:
                    things = data['json']['data'].get('things', [])
                    
                    for thing in things:
                        if thing['kind'] == 't1':  # Comment
                            comment_data = thing['data']
                            # Convert the raw data to RedditComment
                            comment = self._raw_to_comment(comment_data)
                            
                            # Process nested replies if they exist
                            if 'replies' in comment_data and comment_data['replies']:
                                if isinstance(comment_data['replies'], dict):
                                    comment.replies = self._process_replies(
                                        RedditResponse.model_validate(comment_data['replies']),
                                        base_permalink
                                    )
                            
                            all_comments.append(comment)
                
                # Add small delay to avoid rate limiting
                time.sleep(0.5)
                
            except Exception as e:
                print(f"Error fetching more comments: {e}")
                continue
        
        return all_comments

    def _process_comments_recursively(self, comments_data: dict, base_permalink: str) -> List[RedditComment]:
        """
        Process comments data and handle 'more' comments by drilling down.
        """
        reddit_response = RedditResponse.model_validate(comments_data)
        processed_comments = []
        
        for child in reddit_response.data.children:
            if child.kind == "t1":  # Regular comment
                comment = child.data
                # Process replies recursively if they exist
                if comment.replies and not isinstance(comment.replies, str):
                    comment.replies = self._process_replies(comment.replies, base_permalink)
                processed_comments.append(comment)
                
            elif child.kind == "more":  # More comments to load
                more_data = child.data
                # Fetch the additional comments
                more_comments = self._fetch_more_comments(
                    more_data.children, 
                    base_permalink,
                    more_data.parent_id
                )
                processed_comments.extend(more_comments)
        
        return processed_comments
    
    def _process_replies(self, replies_response: RedditResponse, base_permalink: str) -> RedditResponse:
        """
        Process nested replies, handling 'more' comments within reply chains.
        """
        processed_children = []
        
        for child in replies_response.data.children:
            if child.kind == "t1":  # Regular comment
                comment = child.data
                # Recursively process nested replies
                if comment.replies and not isinstance(comment.replies, str):
                    comment.replies = self._process_replies(comment.replies, base_permalink)
                processed_children.append(child)
                
            elif child.kind == "more":  # More replies to load
                more_data = child.data
                # Fetch additional replies
                more_comments = self._fetch_more_comments(
                    more_data.children,
                    base_permalink, 
                    more_data.parent_id
                )
                # Convert comments to child format for consistency
                for comment in more_comments:
                    processed_children.append(
                        type('obj', (object,), {
                            'kind': 't1',
                            'data': comment
                        })()
                    )
        
        # Update the response with processed children
        replies_response.data.children = processed_children
        return replies_response

    def _extract_link_id(self, permalink: str) -> str:
        """
        Extract the link ID (post ID) from a permalink.
        Example: '/r/deaf/comments/1mg82a6/...' -> 't3_1mg82a6'
        """
        parts = permalink.split('/')
        for i, part in enumerate(parts):
            if part == 'comments' and i + 1 < len(parts):
                return f"t3_{parts[i + 1]}" # TODO I am not sure about the t3 part here
        return ""
    
    def _raw_to_comment(self, data: dict) -> RedditComment:
        """
        Convert raw comment data from API to RedditComment model.
        """
        return RedditComment(
            id=data.get('id', ''),
            subreddit=data.get('subreddit', ''),
            ups=data.get('ups', 0),
            downs=data.get('downs', 0),
            send_replies=data.get('send_replies', False),
            permalink=data.get('permalink', ''),
            author_flair_text=data.get('author_flair_text'),
            author=data.get('author', '[deleted]'),
            created_utc=data.get('created_utc', 0),
            body=data.get('body', ''),
            replies=data.get('replies', ''),
            controversiality=data.get('controversiality', 0),
            depth=data.get('depth', 0),
            media_metadata=data.get('media_metadata')
        )
   

    def get_post_comments(self, reddit_post: RedditPost) -> List[RedditComment]:
        comments = self.search_comments(reddit_post.permalink)
        return comments


class RedditAPIManager:
    """This class manages to send all of the searches that need to be searched in the subreddit. It also makes sure to limit the number of responses send
    
    :params 
        subreddit: to search in
        keywords: list of keywords to search for in subreddit
        number_posts_per_keyword: total number of posts to extract per keyword [TODO should this be dynamically set?]"""
    def __init__(self, number_posts_per_keyword: int):
        self.scraper = RedditScraperAPI()
        self.number_posts_per_keyword = number_posts_per_keyword
    

    def scrape_subreddit(self):
        """scrapes the whole subreddit with each of the keywords and builds the reddit conversation Post entity"""
        
    def find_related_posts_to_keyword(
            self,
            subreddit: str, 
            keyword: str, 
            age: Literal["hour", "day", "week", "month", "year", "all"] = "all",
            filter: Literal["new", "hot", "top", "rising"] = "top"):
        
        reddit_posts = self.scraper.search(subreddit=subreddit,
                                    query=keyword,
                                    age=age, # or past year only to only focus on unmet needs?
                                    limit=self.number_posts_per_keyword,
                                    filter=filter)
        return reddit_posts
    
    def get_comments_drilled_down(self, reddit_comments: List[RedditComment]):
        """the api of reddit, drills up the comments that have a high depth. 
        So we have to re exucte the search for these comments"""
        # :TODO we need to implement it here right? Or should we do it somewhere else?
        return 
                
    
    def scrape_comments_of_post(self, reddit_post: RedditPost):
        # TODO: here we would like a try and except block because it might fail because of limits
        
        comments = self.scraper.get_post_comments(reddit_post)

        # TODO: Here we have to make so that all the comments, that are not yet drilled down (have kind = "more"), are drilled down recursively

        # comments = self.get_comments_drilled_down(comments)

        return comments

if __name__ == "__main__":

    redditScaper= RedditScraperAPI()
    posts = redditScaper.search("deaf", "pasta", "all")
    with open("data/search_result1.json", "w") as f:
        f.writelines([post.model_dump_json() for post in posts])
    # post_to_save = posts[0]
    # with open("data/cached_post1.json", "w") as f:
    #     f.write(post_to_save.model_dump_json(indent=4))
    # comments = redditScaper.get_post_comments(post_to_save)
    # comments_json = [comment.model_dump() for comment in comments]
    # with open("data/cached_comments1.json", "w") as f:
    #     f.write(json.dumps(comments_json, indent=4))
