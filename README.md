# Web3 去中心化赏金任务平台

基于 EVM 链的去中心化赏金任务平台：发布者锁定 ETH/ERC20 作为赏金，猎人提交成果，发布者审核后由合约自动支付。

## 架构概览

- 智能合约层：Hardhat + Solidity + OpenZeppelin
- 前端 DApp：Vue 3 + Vite + TypeScript + Tailwind + Pinia + Vue Router
- 仓库形态：Monorepo（合约与前端分离）

## 目录说明

```text
bounty-platform/
├── contracts/                # 合约目录（core/interfaces/mocks/libraries）
├── scripts/                  # 部署与运维脚本
├── test/                     # 合约测试（unit/integration）
├── frontend/                 # Vue 3 前端 DApp
├── .github/workflows/        # CI/CD
├── .husky/                   # Git hooks
├── hardhat.config.js         # Hardhat 配置
└── package.json              # 根依赖配置
```

## 角色与状态流转

- 角色：Publisher、Hunter、Admin/Owner
- 状态：`OPEN -> WORK_SUBMITTED -> COMPLETED` 或 `OPEN -> CANCELLED`

## 合约核心接口

- `createBounty(string _title, string _descURI, address _tokenAddress, uint256 _rewardAmount, uint256 _deadline)`
- `submitWork(uint256 _bountyId, string _proofURI)`
- `approveWork(uint256 _bountyId, address _hunter)`
- `cancelBounty(uint256 _bountyId)`

## 事件

- `BountyCreated`
- `WorkSubmitted`
- `BountyPaid`
- `BountyCancelled`

## 安全要求

- 资金函数使用 `ReentrancyGuard`
- 严格权限控制（发布者审核/取消）
- ERC20 使用 `SafeERC20`
- 管理员可紧急暂停（`Pausable`）

## 开发规范

- Solidity: `^0.8.20`
- 合约注释：Natspec
- 前端：ESLint + Prettier
- 测试覆盖率目标：95%+

## 当前版本状态

`V2.1 (Vue 3 前端架构版)`：已建立项目骨架，等待业务实现与联调。

## 本地运行（推荐：Hardhat 本地链）

### 1. 安装依赖

在项目根目录执行：

```bash
npm i
```

### 2. 启动本地链

新开一个终端窗口执行：

```bash
npm run node
```

### 3. 编译 + 部署 Bounty 合约 + 同步 ABI 到前端

再新开一个终端窗口，在项目根目录执行：

```bash
npm run deploy:local:sync
```

脚本会打印合约地址，请复制保存。

### 4. （可选）部署 MockERC20 并给测试账号 mint

用于演示 ERC20 发单流程：

```bash
npm run setup:local:erc20
```

脚本会输出 `Token Address`，用于在前端 Create 页面粘贴。

### 5. 配置前端环境变量

在 `frontend/.env.local` 写入：

```bash
VITE_BOUNTY_CONTRACT_ADDRESS=0x你的合约地址
VITE_RPC_URL=http://127.0.0.1:8545
VITE_DEPLOY_BLOCK=0
```

### 6. 启动前端

在 `frontend/` 目录执行：

```bash
npm i
npm run dev
```

## 部署到 Sepolia（公网测试网）

### 1. 配置根目录 `.env`

复制 `.env.example` 为 `.env`，并填入：

```bash
PRIVATE_KEY=你的私钥
SEPOLIA_RPC_URL=你的 Sepolia RPC
ETHERSCAN_API_KEY=你的 Etherscan Key
```

### 2. 部署合约

```bash
npm run deploy:sepolia
```

记录输出的合约地址与部署区块号（用于前端事件查询性能）。

### 3. Etherscan 验证

`scripts/verify.js` 需要传入合约地址：

```bash
npx hardhat run scripts/verify.js <BountyContractAddress> --network sepolia
```

### 4. 配置前端（Sepolia）

在 `frontend/.env.production`（或 `.env.local`）写入：

```bash
VITE_BOUNTY_CONTRACT_ADDRESS=0x你的 Sepolia 合约地址
VITE_RPC_URL=你的 Sepolia RPC
VITE_DEPLOY_BLOCK=你的部署区块号
```
