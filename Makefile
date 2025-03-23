build:
	# remove old build
	rm -rf build
	# build inside build folder
	npm run build

create-config:
	chmod +x ./scripts/create_config.sh
	./scripts/create_config.sh

test: build create-config
	npx @wong2/mcp-cli -c ./test/config.json
