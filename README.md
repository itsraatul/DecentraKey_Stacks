# DecentraKey – NFT-Based Software Licensing

DecentraKey is a blockchain-powered software key licensing platform. It turns software license keys into non-transferable NFTs (also known as SBTs or Soulbound Tokens) on the Stacks blockchain, making them easy to issue, redeem, and verify securely all without the fear of stealing or duplication.

🚀Tech Stack Used

* Backend: Node.js + Express.js
* Frontend: EJS + TailwindCSS
* Database: MySQL (via Sequelize ORM)
* Blockchain: Stacks (Testnet)
* Wallet: Leather Wallet (for user interactions)
* Smart Contracts: Clarity

⚙️ Setup Instructions

# Clone this repository
* git clone https://github.com/your-repo/decentrakey.git
    cd decentrakey/server
* Install dependencies
* npm install


# Configure environment variables
* Create a .env file inside the server/ folder:
    DB_HOST=localhost
    DB_NAME=decentrakey
    DB_USER=root
    DB_PASSWORD=

    CONTRACT_ADDRESS=ST2JVNDBYHEXN4THNQ2RFGG02JJZSSQM31MJVYWBR
    CONTRACT_NAME=decentrakey-mvp
    HIRO_API=https://api.testnet.hiro.so

# Start the server
  *  node index.js


# Server will run on: http://localhost:3000


# Deploy the Smart Contract (Clarity)
* Use Clarinet or Hiro Explorer sandbox to deploy.
* Update the .env file with your contract address + name.


📜 Smart Contract Address

* Contract Name: decentrakey-mvp
* Deployed on: Stacks Testnet
* Address: ST2JVNDBYHEXN4THNQ2RFGG02JJZSSQM31MJVYWBR.decentrakey-mvp


💡 How to Use the Project

# For Companies (License Issuers)

* Register/Login via /company/register or /company/login.
* Generate a Claim Link for customers.
* Send the secure claim link to the customer.

# For Customers

* Open the claim link.
* Connect your Leather Wallet.
* Claim the license → This mints the NFT into your wallet.

# Verification (in Apps)

* Go to /verify-license.
* Connect your wallet.
* Scan licenses & verify ownership on-chain.

👨‍💻 Team Members
* Arunangshu Raatul



📸 Screenshots / 🎥 Demo

<img width="1266" height="663" alt="image" src="https://github.com/user-attachments/assets/a1fd0ef4-46e9-4988-ad39-f0743e397578" />

* https://drive.google.com/file/d/11eP5G2Hu7PgI6777WAj0HCIHT5wEY3VV/view?usp=drive_link
