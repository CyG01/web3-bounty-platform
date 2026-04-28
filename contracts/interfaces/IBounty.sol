// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IBounty {
    enum BountyStatus {
        OPEN,
        WORK_SUBMITTED,
        COMPLETED,
        CANCELLED
    }

    struct Bounty {
        uint256 id;
        address publisher;
        string title;
        string descriptionURI;
        uint256 rewardAmount;
        address tokenAddress;
        uint256 deadline;
        BountyStatus status;
        address successfulHunter;
    }

    struct Submission {
        address hunter;
        string proofURI;
        uint256 timestamp;
    }

    event BountyCreated(
        uint256 indexed bountyId,
        address indexed publisher,
        address indexed tokenAddress,
        uint256 rewardAmount
    );
    event WorkSubmitted(uint256 indexed bountyId, address indexed hunter, string proofURI);
    event WorkRejected(uint256 indexed bountyId, address indexed publisher, address indexed hunter);
    event BountyPaid(uint256 indexed bountyId, address indexed hunter, uint256 amount);
    event BountyCancelled(uint256 indexed bountyId, address indexed publisher, uint256 refundAmount);
    event ReviewPeriodUpdated(uint256 oldPeriod, uint256 newPeriod);
    event MinimumRewardUpdated(uint256 oldMinimum, uint256 newMinimum);

    function createBounty(
        string memory _title,
        string memory _descURI,
        address _tokenAddress,
        uint256 _rewardAmount,
        uint256 _deadline
    ) external payable returns (uint256);

    function submitWork(uint256 _bountyId, string memory _proofURI) external;

    function approveWork(uint256 _bountyId, address _hunter) external;

    function cancelBounty(uint256 _bountyId) external;

    function rejectWork(uint256 _bountyId, address _hunter) external;

    function hunterClaim(uint256 _bountyId) external;

    function setMinimumReward(uint256 newMinimum) external;

    function minimumReward() external view returns (uint256);

    function getBountiesPaginated(
        uint256 cursor,
        uint256 size
    ) external view returns (Bounty[] memory, uint256 nextCursor);

    function getBounty(uint256 _bountyId) external view returns (Bounty memory);

    function getSubmission(uint256 _bountyId, address _hunter) external view returns (Submission memory);

    function getBountyHunters(uint256 _bountyId) external view returns (address[] memory);

    function getBountyCount() external view returns (uint256);
}
