#!/usr/bin/env python3
"""Configure the game's menu button. Read credentials from the environment only."""

import argparse
import http.client
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request


class SetupError(Exception):
    """A user-facing error containing no request URLs or credentials."""


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, message, headers, new_url):
        raise SetupError("Неожиданное перенаправление Telegram API; запрос остановлен.")


class TelegramAPI:
    def __init__(self, token):
        if not token:
            raise SetupError("Добавьте TELEGRAM_BOT_TOKEN в секреты окружения.")
        self._token = token
        self._opener = urllib.request.build_opener(NoRedirect)

    def call(self, method, payload=None):
        allowed = {"getMe", "getChatMenuButton", "setChatMenuButton"}
        if method not in allowed:
            raise SetupError("Эта операция не нужна для настройки игры.")
        request = urllib.request.Request(
            "https://api.telegram.org/bot" + self._token + "/" + method,
            data=json.dumps(payload or {}).encode(),
            headers={"Content-Type": "application/json", "User-Agent": "vyshe-setup"},
            method="POST",
        )
        try:
            with self._opener.open(request, timeout=25) as response:
                result = json.load(response)
        except urllib.error.HTTPError as error:
            # HTTPError includes the token-bearing URL: never stringify it.
            raise SetupError(f"Telegram API: HTTP {error.code} при {method}.") from None
        except (urllib.error.URLError, OSError, http.client.HTTPException):
            raise SetupError("Нет соединения с api.telegram.org; проверьте разрешения сети.") from None
        except (ValueError, TypeError):
            raise SetupError("Telegram API вернул неожиданный ответ.") from None
        if not isinstance(result, dict) or not result.get("ok"):
            raise SetupError(f"Telegram API не подтвердил операцию {method}.")
        return result["result"]


def validate_url(url):
    try:
        parsed = urllib.parse.urlsplit(url)
        valid = (
            parsed.scheme == "https"
            and bool(parsed.hostname)
            and parsed.hostname not in {"localhost", "127.0.0.1", "::1"}
            and not parsed.username and not parsed.password and not parsed.fragment
        )
    except ValueError:
        valid = False
    if not valid:
        raise SetupError("GAME_URL должен быть публичным HTTPS-адресом игры без пароля и фрагмента.")
    return url


def check_public_game(url):
    validate_url(url)
    try:
        request = urllib.request.Request(url, headers={"User-Agent": "vyshe-setup"})
        with urllib.request.urlopen(request, timeout=25) as response:
            body = response.read(262144).decode("utf-8", errors="replace")
            if response.status != 200 or "Выше — только небо впереди" not in body:
                raise SetupError("По GAME_URL пока не найдена опубликованная игра «Выше».")
    except (urllib.error.URLError, OSError):
        raise SetupError("Публичный адрес игры недоступен; сначала опубликуйте сборку dist/.") from None


def configure(api, url, check_only=False):
    identity = api.call("getMe")
    if not identity.get("is_bot") or not identity.get("username"):
        raise SetupError("Telegram не подтвердил учётную запись бота.")
    current = api.call("getChatMenuButton")
    if check_only:
        return {"status": "access_verified", "bot": "@" + identity["username"], "menu_type": current.get("type")}

    check_public_game(url)
    desired = {"type": "web_app", "text": "Играть", "web_app": {"url": url}}
    if current != desired:
        if api.call("setChatMenuButton", {"menu_button": desired}) is not True:
            raise SetupError("Telegram не подтвердил сохранение кнопки.")
    if api.call("getChatMenuButton") != desired:
        raise SetupError("Проверка кнопки после сохранения не прошла.")
    return {"status": "configured", "bot": "@" + identity["username"], "button": "Играть", "game_url": url}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Только проверить доступ к боту, не менять настройки")
    parser.add_argument("--url", default=os.environ.get("GAME_URL", ""), help="Публичный HTTPS-адрес игры (или GAME_URL)")
    args = parser.parse_args()
    try:
        if not args.check:
            validate_url(args.url)
        api = TelegramAPI(os.environ.get("TELEGRAM_BOT_TOKEN", "").strip())
        print(json.dumps(configure(api, args.url, args.check), ensure_ascii=False))
    except SetupError as error:
        print(str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
