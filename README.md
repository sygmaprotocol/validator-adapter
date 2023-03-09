# Validator Adapter

This set of contracts is intended to be used with the Bridge contract and the Permissionless Generic Handler.

# Deployment and configuration
DepositAdapterOrigin is deployed on the origin chain.
Bridge address and resourceID are set in the constructor.
Deposit fee is 3.2 ether by default and can be changed if necessary.

DepositAdapterTarget is deployed on the target chain.
Addresses of the PermissionlessDepositHandler and of the Deposit Contract are set in the constructor.

The address of the deployed DepositAdapterOrigin from the origin chain is set in the DepositAdapterTarget.
The address of the deployed DepositAdapterTarget from the origin chain is set in the DepositAdapterOrigin.

The deployed DepositAdapterTarget contract needs to have ether on its address for deposits to the Deposit Contract (32 ether per deposit).
