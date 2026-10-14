# jira-read-mcp

MCP-сервер для чтения задачи Jira по ключу.

Какие данные достает из Jira:
- название
- описание,
- статус,
- исполнителя,
- автора
- комментарии.

## Tool `read_task`

Параметр:

- `issue_key` (string, обязательный) — ключ задачи, например `JIRA-1234`.

Возвращает название, описание, статус, исполнителя, автора и комментарии.

## Как подключить и использовать

Внутри своего проекта добавляем файл `.env` и заполняем:

```sh
# меняем на свой домен
JIRA_BASE_URL=https://tracker.mycompany.ru
# вставляем свой токен доступа
JIRA_TOKEN=personal-access-token
```

`JIRA_TOKEN` — Personal Access Token Jira. Сервер отправляет его как `Authorization: Bearer`.

Скачиваем архив с сервером, распаковываем в любую директорию, и прописываем путь до сервера в `mcp.json`:

```json
{
  "mcpServers": {
    "jira": {
      "command": "node",
      "args": ["/ABS/PATH/jira-read-mcp/index.js"],
      "envFile": "/ABS/PATH/.env"
    }
  }
}
```

Сохраняем конфиг, и перезапускаем MCP.
