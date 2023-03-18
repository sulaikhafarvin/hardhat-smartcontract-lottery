const { assert, expect } = require("chai")
const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Unit Tests", function () {
          let raffle, raffleEntranceFee, deployer

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              raffle = await ethers.getContract("Raffle", deployer)
              raffleEntranceFee = await raffle.getEntranceFee()
          })

          describe("fulfillRandomWords", function () {
              it("works with live Chainlink Keepers and Chainlink VRF, we get a random winner", async function () {
                  // enter the raffle
                  const startingTimeStamp = await raffle.getLatestTimeStamp()
                  const accounts = await ethers.getSigners()

                  await new Promise(async (resolve, reject) => {
                      // setup listener before we enter raffle
                      // just in case the blockchain moves REALLY fast
                      raffle.once("WinnerPicked", async () => {
                          console.log("WinnerPicked event fired!")

                          try {
                              const recentWinner = await raffle.getRecentWinner()
                              const raffleState = await raffle.getRaffleState()
                              const winnerEndingBalance = await accounts[0].getBalance()
                              const endingTimeStamp = await raffle.getLatestTimeStamp()

                              await expect(raffle.getPlayer(0)).to.be.reverted // reset
                              assert.equal(recentWinner.toString(), accounts[0].address) // deployer
                              assert.equal(raffleState, 0)
                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  winnerStartingBalance.add(raffleEntranceFee).toString()
                              )
                              assert(endingTimeStamp > startingTimeStamp)
                              resolve()
                          } catch (error) {
                              console.log(error)
                              reject(e)
                          }
                      })
                      // then entering the raffle
                      const tx = await raffle.enterRaffle({ value: raffleEntranceFee })
                      await tx.wait(1)
                      const winnerStartingBalance = await accounts[0].getBalance()

                      //this code WONT complete until our listener has finised listening!
                  })
              })
          })
      })

/**
 * Steps for runing staging test on test network
 * 1 - Get our SubId for Chainlink VRF
 * 2 - Deploy our contract using the SubId
 * 3 - Register the contract with Chainlink VRF & it's SubId
 * 4 - Register the contract with Cahinlink Keepers
 * 5 - Run staging tests
 */
