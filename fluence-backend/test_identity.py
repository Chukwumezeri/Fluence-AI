import google.auth
import google.auth.transport.requests

def main():
    credentials, project = google.auth.default()
    request = google.auth.transport.requests.Request()
    credentials.refresh(request)
    print(f"Project: {project}")
    print(f"Credentials type: {type(credentials)}")
    
    # Try to find the associated service account
    if hasattr(credentials, "service_account_email"):
        print(f"SA Email: {credentials.service_account_email}")
    else:
        print("No service_account_email attribute.")
        
    # Check token info
    import urllib.request
    import json
    try:
        req = urllib.request.Request(f"https://oauth2.googleapis.com/tokeninfo?access_token={credentials.token}")
        with urllib.request.urlopen(req) as response:
            info = json.loads(response.read().decode())
            print("Token info email:", info.get("email", "Not found"))
    except Exception as e:
        print("Failed to get token info:", e)

if __name__ == "__main__":
    main()
