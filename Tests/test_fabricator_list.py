import pytest

from parallel_test_runner import testLevel

def __desc__():
    return "Fabricator List Tests"

@pytest.mark.dependency(depends=["test_app.py::test_main_view_response_is_200"], scope="session")
@pytest.mark.skipif(condition=testLevel < 1, reason="Not doing lvl 1 tests")
def test_fabricator_list_has_at_least_one_fabricator(app):
    assert len(app.fabricator_list) > 0, "Fabricator list is empty"


@pytest.mark.dependency(depends=["test_fabricator_list_has_at_least_one_fabricator"])
@pytest.mark.skipif(condition=testLevel < 1, reason="Not doing lvl 1 tests")
def test_fabricator_list_has_fabricator_from_fixture(app, fabricator):
    assert fabricator is not None, "Fabricator is None"
    assert fabricator in app.fabricator_list, "Fabricator not in list"


@pytest.mark.dependency(depends=["test_fabricator_list_has_fabricator_from_fixture"])
@pytest.mark.skipif(condition=testLevel < 1, reason="Not doing lvl 1 tests")
def test_fabricator_thread_is_running(app, fabricator):
    thread = app.fabricator_list.get_fabricator_thread(fabricator)
    assert thread.is_alive(), "Fabricator thread is not running"
    assert thread.daemon, "Fabricator thread is not daemon"
