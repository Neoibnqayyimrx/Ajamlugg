"""Create a test Stream call exactly the way session+api.ts does, so we can
verify the Python teacher agent joins the real call flow (not a parallel one).

Run: uv run python scripts/make_test_call.py
"""

import asyncio
import re

from dotenv import load_dotenv
from getstream import AsyncStream

load_dotenv()

LANGUAGE_ID = "hausa-ajami"
LESSON_ID = "hausa-lesson-1-1"
LESSON_TITLE = "The First Three Letters"
USER_ID = "test-user-e2e"
CALL_TYPE = "default"


async def main() -> None:
    call_id = re.sub(r"[^a-zA-Z0-9_-]", "-", f"{LANGUAGE_ID}-{LESSON_ID}-{USER_ID}")

    client = AsyncStream()  # reads STREAM_API_KEY / STREAM_API_SECRET from env
    await client.create_user(name="Test Learner", id=USER_ID)

    call = client.video.call(CALL_TYPE, call_id)
    await call.get_or_create(
        data={
            "created_by_id": USER_ID,
            "members": [{"user_id": USER_ID}],
            "custom": {
                "lessonId": LESSON_ID,
                "languageId": LANGUAGE_ID,
                "lessonTitle": LESSON_TITLE,
            },
        }
    )
    print(f"call_id={call_id}")
    await client.aclose()


if __name__ == "__main__":
    asyncio.run(main())
