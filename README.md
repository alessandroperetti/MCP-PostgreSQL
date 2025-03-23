# MCP-PostgreSQL
MCP-PostgreSQL is a Typescript ModelContextProtocol Server capable of enabling the interaction between a PostgreSQL database and LLM.

It works quite well with a Database composed by different schemas, too.

# Do you need the Claude-Desktop for Linux Ubuntu? 
This is an unoffical version but it allows to use Claude-Desktop In Linux Ubuntu:
[https://github.com/wankdanker/claude-desktop-linux-bash](https://github.com/wankdanker/claude-desktop-linux-bash)

# Create Config for Claude Desktop
In scripts folder:

`chmod +x create_config.sh`

and then run: 

`./create_config.sh`

If you need to pass different parameters:

`./create_config.sh PGusername PGpassword PGserverUrl PGserverPort PGdbname`

Move the generated `config.json` to claude-desktop application configuration