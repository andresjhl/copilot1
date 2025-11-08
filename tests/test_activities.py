import copy

import pytest
from fastapi.testclient import TestClient

import src.app as appmod


client = TestClient(appmod.app)


@pytest.fixture(autouse=True)
def reset_activities():
    """Reset the in-memory activities dict before/after each test to avoid state bleed."""
    original = copy.deepcopy(appmod.activities)
    try:
        yield
    finally:
        appmod.activities.clear()
        appmod.activities.update(copy.deepcopy(original))


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    # sample known key from seed data
    assert "Chess Club" in data


def test_signup_and_unregister_flow():
    activity = "Chess Club"
    email = "tester+signup@example.com"

    # ensure not present
    assert email not in appmod.activities[activity]["participants"]

    # signup
    resp = client.post(f"/activities/{activity}/signup", params={"email": email})
    assert resp.status_code == 200
    assert f"Signed up {email}" in resp.json().get("message", "")

    # verify participant appears in GET /activities
    resp2 = client.get("/activities")
    assert resp2.status_code == 200
    assert email in resp2.json()[activity]["participants"]

    # duplicate signup should fail
    resp_dup = client.post(f"/activities/{activity}/signup", params={"email": email})
    assert resp_dup.status_code == 400

    # unregister
    resp3 = client.delete(f"/activities/{activity}/participants", params={"email": email})
    assert resp3.status_code == 200
    assert f"Unregistered {email}" in resp3.json().get("message", "")

    # ensure removed
    resp4 = client.get("/activities")
    assert email not in resp4.json()[activity]["participants"]

    # deleting again should return 404
    resp5 = client.delete(f"/activities/{activity}/participants", params={"email": email})
    assert resp5.status_code == 404
