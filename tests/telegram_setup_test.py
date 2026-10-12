import importlib.util
import pathlib
import unittest
import urllib.error
from unittest.mock import Mock, patch

source = pathlib.Path(__file__).resolve().parents[1] / "scripts" / "configure_telegram.py"
spec = importlib.util.spec_from_file_location("configure_telegram", source)
setup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(setup)


class TelegramSetupTests(unittest.TestCase):
    def test_no_local_http_or_embedded_passwords(self):
        for url in ["", "http://game.example/", "https://localhost/", "https://user:password@game.example/", "https://game.example/#token"]:
            with self.subTest(url=url), self.assertRaises(setup.SetupError):
                setup.validate_url(url)
        self.assertEqual(setup.validate_url("https://game.example/testgpt/"), "https://game.example/testgpt/")

    def test_missing_token_is_reported(self):
        with self.assertRaisesRegex(setup.SetupError, "TELEGRAM_BOT_TOKEN"):
            setup.TelegramAPI("")

    def test_check_only_does_not_change_bot_or_request_hosting(self):
        api = Mock()
        api.call.side_effect = [{"is_bot": True, "username": "example_bot"}, {"type": "commands"}]
        result = setup.configure(api, "", check_only=True)
        self.assertEqual(result["status"], "access_verified")
        self.assertEqual([call.args[0] for call in api.call.call_args_list], ["getMe", "getChatMenuButton"])

    def test_configures_only_menu_and_checks_persistence(self):
        url = "https://game.example/testgpt/"
        desired = {"type": "web_app", "text": "Играть", "web_app": {"url": url}}
        api = Mock()
        api.call.side_effect = [{"is_bot": True, "username": "example_bot"}, {"type": "commands"}, True, desired]
        with patch.object(setup, "check_public_game") as check:
            result = setup.configure(api, url)
        check.assert_called_once_with(url)
        self.assertEqual(result["status"], "configured")
        self.assertEqual([call.args[0] for call in api.call.call_args_list], ["getMe", "getChatMenuButton", "setChatMenuButton", "getChatMenuButton"])
        self.assertEqual(api.call.call_args_list[2].args[1], {"menu_button": desired})

    def test_existing_correct_button_is_not_rewritten(self):
        url = "https://game.example/"
        desired = {"type": "web_app", "text": "Играть", "web_app": {"url": url}}
        api = Mock()
        api.call.side_effect = [{"is_bot": True, "username": "example_bot"}, desired, desired]
        with patch.object(setup, "check_public_game"):
            setup.configure(api, url)
        self.assertNotIn("setChatMenuButton", [call.args[0] for call in api.call.call_args_list])

    def test_unpublished_game_does_not_change_bot(self):
        api = Mock()
        api.call.side_effect = [{"is_bot": True, "username": "example_bot"}, {"type": "commands"}]
        with patch.object(setup, "check_public_game", side_effect=setup.SetupError("Not published")):
            with self.assertRaises(setup.SetupError):
                setup.configure(api, "https://game.example/")
        self.assertEqual(api.call.call_count, 2)

    def test_http_errors_never_expose_token_or_request_url(self):
        api = setup.TelegramAPI("test-value-not-a-real-token")
        api._opener = Mock()
        api._opener.open.side_effect = urllib.error.HTTPError("https://api.telegram.org/bottest-value-not-a-real-token/getMe", 401, "Denied", {}, None)
        with self.assertRaises(setup.SetupError) as caught:
            api.call("getMe")
        self.assertNotIn("test-value", str(caught.exception))
        self.assertNotIn("https://", str(caught.exception))
        self.assertIn("401", str(caught.exception))


if __name__ == "__main__":
    unittest.main()
