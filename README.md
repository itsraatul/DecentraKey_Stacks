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

  # The work flow:
<img width="1131" height="532" alt="image" src="https://github.com/user-attachments/assets/7496b108-5e47-498a-a899-a89a72324bf1" />

# The Smart Contract Deployment:
<img width="1475" height="725" alt="image" src="https://github.com/user-attachments/assets/dccd662a-a363-455f-b7a7-921ea209bd91" />

# Successful Function Call:
 <img width="1558" height="707" alt="image" src="https://github.com/user-attachments/assets/d60013c2-2e18-4a6a-8579-61da5d88e415" />

# The Landing Page:
  <img width="1872" height="840" alt="image" src="https://github.com/user-attachments/assets/5165c6d0-1b4c-4587-b2f0-9f9f03381ba3" />

# Fetching the data from the Blockchain
<img width="1250" height="510" alt="image" src="https://github.com/user-attachments/assets/321ff1d1-d939-4082-a274-e2e4240e0609" />

# Minting NFT
<img width="441" height="183" alt="image" src="https://github.com/user-attachments/assets/1a76b0ef-d7a3-42b0-9044-ee13e9bfc4f6" />

# The The Proper Wallet Integration with Frontend:
  <img width="472" height="940" alt="image" src="https://github.com/user-attachments/assets/8a40f8ce-0136-4843-9f1f-986fe7cab0e3" />

  
     
      

# Video: https://drive.google.com/file/d/11eP5G2Hu7PgI6777WAj0HCIHT5wEY3VV/view?usp=drive_link
