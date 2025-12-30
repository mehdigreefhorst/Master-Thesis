import requests
from typing import Dict, Optional

class ApplicationTester:
    endpoint = "http://127.0.0.1:5001"

    def __init__(self):
        self.access_token: Optional[str] = None
        self.refresh_token: Optional[str] = None
        self.session = requests.Session()
        self.login()

    def signup(self):
        signup_endpoint = f"{self.endpoint}/auth/signup"
        email = "test@test.nl"
        password = "tester123"
        login_data = {"email": email, "password": password}

        response = requests.post(signup_endpoint, json=login_data)
        returnable  = response.json()
        print(returnable)

        login_endpoint = f"{self.endpoint}/auth/login"

        response = requests.post(login_endpoint, json=login_data)
        access_token = response.json()["access_token"]
        print("access_token = ", access_token)
        return returnable, access_token

    # ---------- auth ----------
    def login(self):
        login_endpoint = f"{self.endpoint}/auth/login"
        data = {"email": "test@test.nl", "password": "tester123"}
        r = self.session.post(login_endpoint, json=data)
        r.raise_for_status()
        payload = r.json()
        # Keep both tokens
        self.access_token = payload["access_token"]
        self.refresh_token = payload["refresh_token"]

    def _auth_header(self, use_refresh: bool = False) -> Dict[str, str]:
        token = self.refresh_token if use_refresh else self.access_token
        return {"Authorization": f"Bearer {token}"} if token else {}

    def refresh(self) -> bool:
        """Use the refresh token to get a new pair of tokens. Returns True on success."""
        refresh_endpoint = f"{self.endpoint}/auth/refresh"
        r = self.session.post(refresh_endpoint, headers=self._auth_header(use_refresh=True))
        if r.status_code == 200:
            payload = r.json()
            self.access_token = payload["access_token"]
            self.refresh_token = payload["refresh_token"]
            return True
        return False

    # ---------- request wrapper that auto-refreshes ----------
    def _request(self, method: str, path: str, **kwargs):
        if not path.startswith("/"):
            raise ValueError("Path should start with /")
        url = f"{self.endpoint}{path}"

        # 1st attempt with access token
        headers = kwargs.pop("headers", {})
        headers.update(self._auth_header())
        resp = self.session.request(method, url, headers=headers, **kwargs)

        # If access token expired, try once to refresh and retry
        if resp.status_code == 401:
            # Optional: check msg to ensure it’s token-expired, not other auth error
            try:
                msg = resp.json().get("msg", "").lower()
            except Exception:
                msg = ""
            if "token has expired" in msg or "signature verification failed" in msg or "not fresh" in msg or not msg:
                if self.refresh():
                    headers = kwargs.get("headers", {})
                    headers.update(self._auth_header())
                    return self.session.request(method, url, headers=headers, **kwargs)
        return resp

    # ---------- public HTTP helpers ----------
    def post(self, path: str, json_data: Dict):
        return self._request("POST", path, json=json_data)
    
    def delete(self, path: str, json_data: Dict):
        return self._request("DELETE", path, json=json_data)

    def get(self, path: str, search_params=None):
        return self._request("GET", path, params=search_params)

    def put(self, path: str, json_data: Dict):
        return self._request("PUT", path, json=json_data)

app = ApplicationTester()