network=nile

deploy-sepolia:
	$(MAKE) deploy network=sepolia

deploy-amoy:
	$(MAKE) deploy network=amoy

deploy-holesky:
	$(MAKE) deploy network=holesky

deploy-arbitrum-sepolia:
	$(MAKE) deploy network=arbitrum-sepolia

deploy-nile:
	$(MAKE) _deploy-tron network=nile

deploy-tron:
	$(MAKE) _deploy-tron network=tron

#Befor deploy to tron change pragma to solidity ^0.8.18;
#And remove all safe methods
_deploy-tron:
	npx tronbox migrate --f 1 --to 1 --network $(network)

set-pools-tron:
	npx tronbox migrate --f 2 --to 2 --network $(network)

set-pool-tron: #Set args inside the script
	node ./tron/scripts/set-pool.js --network $(network)

transfer-ownership-tron:
	node ./tron/scripts/transfer-ownership.js --network $(network)

deploy-all: deploy-sepolia deploy-amoy deploy-holesky deploy-arbitrum-sepolia

deploy:
	npx hardhat ignition deploy ignition/modules/PortfolioToken.ts --network $(network)

get-pool-address:
	npx hardhat pt:pool-address --index $(index) --network $(network)

get-contract-address:
	npx hardhat pt:contract-address --network $(network)

get-all-contract-addresses:
	$(MAKE) get-contract-address network=sepolia \
	&& $(MAKE) get-contract-address network=amoy \
	&& $(MAKE) get-contract-address network=holesky \
	&& $(MAKE) get-contract-address network=arbitrum-sepolia
