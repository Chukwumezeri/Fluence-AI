import asyncio
from gcs_utils import sign_gcs_url

async def main():
    url = await sign_gcs_url("gs://fluence-ai-489309-fluence-assets/test.jpg")
    print(url)

if __name__ == "__main__":
    asyncio.run(main())
