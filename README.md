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

```bash
npm install
npm run build
```

Файл `.env`:

```sh
# меняем на свой домен
JIRA_BASE_URL=https://tracker.mycompany.ru
# вставляем свой токен доступа
JIRA_TOKEN=personal-access-token
```

`JIRA_TOKEN` — Personal Access Token Jira. Сервер отправляет его как `Authorization: Bearer`.

Конфиг в `mcp.json`:

```json
{
  "mcpServers": {
    "jira": {
      "command": "node",
      "args": ["/ABS/PATH/jira-read-mcp/dist/index.js"],
      "envFile": "/ABS/PATH/.env"
    }
  }
}
```

Сохрани конфиг, перезапусти MCP и вызови `read_task`.
