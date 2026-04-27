// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import '@openzeppelin/contracts/utils/Pausable.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '../interfaces/IBounty.sol';

/**
 * @title Bounty Core Contract
 * @dev 实现 Web3 赏金平台的完整生命周期管理，包含防重入、权限控制和紧急暂停功能。
 */
contract Bounty is IBounty, ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    uint256 private _bountyCounter;
    mapping(uint256 => IBounty.Bounty) public bounties;
    mapping(uint256 => mapping(address => IBounty.Submission)) public submissions;
    mapping(uint256 => address[]) public bountyHunters;

    modifier bountyExists(uint256 _bountyId) {
        require(_bountyId > 0 && _bountyId <= _bountyCounter, 'Bounty does not exist');
        _;
    }

    modifier onlyPublisher(uint256 _bountyId) {
        require(bounties[_bountyId].publisher == msg.sender, 'Not the publisher');
        _;
    }

    constructor() Ownable(msg.sender) {}

    function createBounty(
        string memory _title,
        string memory _descURI,
        address _tokenAddress,
        uint256 _rewardAmount,
        uint256 _deadline
    ) external payable whenNotPaused nonReentrant returns (uint256) {
        require(bytes(_title).length > 0, 'Title cannot be empty');
        require(_rewardAmount > 0, 'Reward must be greater than zero');
        require(_deadline > block.timestamp, 'Deadline must be in the future');

        if (_tokenAddress == address(0)) {
            require(msg.value == _rewardAmount, 'Incorrect ETH amount sent');
        } else {
            require(msg.value == 0, 'Do not send ETH for ERC20 bounty');
            IERC20(_tokenAddress).safeTransferFrom(msg.sender, address(this), _rewardAmount);
        }

        _bountyCounter++;
        uint256 newBountyId = _bountyCounter;

        bounties[newBountyId] = IBounty.Bounty({
            id: newBountyId,
            publisher: msg.sender,
            title: _title,
            descriptionURI: _descURI,
            rewardAmount: _rewardAmount,
            tokenAddress: _tokenAddress,
            deadline: _deadline,
            status: BountyStatus.OPEN,
            successfulHunter: address(0)
        });

        emit BountyCreated(newBountyId, msg.sender, _tokenAddress, _rewardAmount);
        return newBountyId;
    }

    function submitWork(uint256 _bountyId, string memory _proofURI) external whenNotPaused bountyExists(_bountyId) {
        IBounty.Bounty storage bounty = bounties[_bountyId];

        require(
            bounty.status == BountyStatus.OPEN || bounty.status == BountyStatus.WORK_SUBMITTED,
            'Bounty is not open for submission'
        );
        require(block.timestamp <= bounty.deadline, 'Bounty deadline has passed');
        require(bounty.publisher != msg.sender, 'Publisher cannot submit work');
        require(submissions[_bountyId][msg.sender].timestamp == 0, 'Work already submitted');

        submissions[_bountyId][msg.sender] = IBounty.Submission({
            hunter: msg.sender,
            proofURI: _proofURI,
            timestamp: block.timestamp
        });
        bountyHunters[_bountyId].push(msg.sender);

        if (bounty.status == BountyStatus.OPEN) {
            bounty.status = BountyStatus.WORK_SUBMITTED;
        }

        emit WorkSubmitted(_bountyId, msg.sender, _proofURI);
    }

    function approveWork(uint256 _bountyId, address _hunter)
        external
        whenNotPaused
        bountyExists(_bountyId)
        onlyPublisher(_bountyId)
        nonReentrant
    {
        IBounty.Bounty storage bounty = bounties[_bountyId];

        require(bounty.status == BountyStatus.WORK_SUBMITTED, 'No work submitted yet');
        require(submissions[_bountyId][_hunter].timestamp > 0, 'This hunter did not submit work');

        bounty.status = BountyStatus.COMPLETED;
        bounty.successfulHunter = _hunter;

        if (bounty.tokenAddress == address(0)) {
            (bool success,) = _hunter.call{value: bounty.rewardAmount}('');
            require(success, 'ETH transfer failed');
        } else {
            IERC20(bounty.tokenAddress).safeTransfer(_hunter, bounty.rewardAmount);
        }

        emit BountyPaid(_bountyId, _hunter, bounty.rewardAmount);
    }

    function cancelBounty(uint256 _bountyId)
        external
        whenNotPaused
        bountyExists(_bountyId)
        onlyPublisher(_bountyId)
        nonReentrant
    {
        IBounty.Bounty storage bounty = bounties[_bountyId];

        require(
            bounty.status == BountyStatus.OPEN || bounty.status == BountyStatus.WORK_SUBMITTED,
            'Cannot cancel at this stage'
        );

        bounty.status = BountyStatus.CANCELLED;

        if (bounty.tokenAddress == address(0)) {
            (bool success,) = msg.sender.call{value: bounty.rewardAmount}('');
            require(success, 'ETH refund failed');
        } else {
            IERC20(bounty.tokenAddress).safeTransfer(msg.sender, bounty.rewardAmount);
        }

        emit BountyCancelled(_bountyId, msg.sender, bounty.rewardAmount);
    }

    function getBounty(uint256 _bountyId) external view bountyExists(_bountyId) returns (IBounty.Bounty memory) {
        return bounties[_bountyId];
    }

    function getSubmission(uint256 _bountyId, address _hunter)
        external
        view
        bountyExists(_bountyId)
        returns (IBounty.Submission memory)
    {
        return submissions[_bountyId][_hunter];
    }

    function getBountyHunters(uint256 _bountyId) external view bountyExists(_bountyId) returns (address[] memory) {
        return bountyHunters[_bountyId];
    }

    function getBountyCount() external view returns (uint256) {
        return _bountyCounter;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    receive() external payable {}
}
