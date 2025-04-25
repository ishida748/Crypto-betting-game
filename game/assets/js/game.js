if (typeof window.Buffer === "undefined") {
  window.Buffer = {
    from: (input, encoding) => {
      if (typeof input === "string") {
        if (encoding === "base64") {
          return Uint8Array.from(atob(input), (c) => c.charCodeAt(0));
        } else if (encoding === "utf-8" || !encoding) {
          return new TextEncoder().encode(input);
        } else if (encoding === "hex") {
          const hex = input.replace(/[^0-9a-fA-F]/g, ""); // Remove non-hex chars
          return Uint8Array.from(
            hex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16))
          );
        } else {
          throw new Error(`Unsupported encoding: ${encoding}`);
        }
      } else if (Array.isArray(input) || input instanceof Uint8Array) {
        return new Uint8Array(input);
      } else {
        throw new Error("Unsupported input type");
      }
    },
    toString: (buffer, encoding) => {
      if (encoding === "base64") {
        return btoa(String.fromCharCode(...buffer));
      } else if (encoding === "utf-8" || !encoding) {
        return new TextDecoder().decode(buffer);
      } else if (encoding === "hex") {
        return Array.from(buffer)
          .map((byte) => byte.toString(16).padStart(2, "0"))
          .join("");
      } else {
        throw new Error(`Unsupported encoding: ${encoding}`);
      }
    },
  };
}

const CAR_IMG = "assets/images/car.svg";
const TILE_IMG = "assets/images/tile.svg";
const STAR_IMG = "assets/images/star.svg";
const BRICK = "assets/images/brick.svg";
const DEAD_CHARACTER = "assets/images/dead.svg";

const { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } =
  solanaWeb3;

const connection = new Connection("https://api.devnet.solana.com");
let totalDeposited = 0;
let totalGambled = 0;

// Example endpoint

let userPublicKey = null;
let userBalance = 0;

const user = {
  balance: 0,
};

const config = {
  currentRoad: -1,
  status: "ended",
  mode: "manual",
  roadContainer: document.querySelector(".road-container"),
  character: document.querySelector("#character"),
  counter: document.querySelector("#counter-text"),
  balanceContainer: document.querySelector("#balance"),
  gameEnded: false,
  carInterval: null,
  isWaiting: false,
  betAmount: 0,
  betAmountOption: null,
  payoutOnWin: 0,
  noOfBets: 0,
  onWinOption: "reset",
  onLossOption: "reset",
  onWinIncrease: 0,
  onLossIncrease: 0,
  stopOnProfit: 0,
  stopOnLoss: 0,
  profit: 0,
  roads: [],
  difficulty: "easy",
};

async function connectWallet() {
  if (window.solana && window.solana.isPhantom) {
    try {
      const resp = await window.solana.connect();
      userPublicKey = resp.publicKey;
      console.log("Wallet connected:", userPublicKey.toString());
      document.getElementById("connect-wallet-btn").textContent =
        "Wallet Connected";

      // Fetch and display balance
      userBalance = await fetchBalance();
      updateBalanceUI(userBalance);

      enableTransactionButtons();
    } catch (error) {
      console.error("Wallet connection failed:", error);
    }
  } else {
    alert("Phantom Wallet not found! Please install it.");
  }
}

async function fetchBalance() {
  const balance = await connection.getBalance(userPublicKey);
  return balance / LAMPORTS_PER_SOL; // Convert lamports to SOL
}

function updateBalanceUI(balance) {
  config.balanceContainer.textContent = balance.toFixed(2);
  user.balance = balance; // Sync wallet balance with game state
}

function enableTransactionButtons() {
  document.getElementById("deposit-btn").disabled = false;
  document.getElementById("withdraw-btn").disabled = false;
  document.querySelectorAll(".start-button").forEach((button) => {
    button.disabled = false;
  });
}

async function deposit(amount) {
  try {
    const lamports = amount * LAMPORTS_PER_SOL;

    const recipientPublicKey = new PublicKey(
      "9u3xCpZ5u6kGbFx7JEDCcncMnep8hWRYEqFNmA3yF4D"
    );

    const { blockhash } = await connection.getLatestBlockhash();

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: userPublicKey,
        toPubkey: recipientPublicKey,
        lamports,
      })
    );

    transaction.recentBlockhash = blockhash;
    transaction.feePayer = userPublicKey;

    const { signature } = await window.solana.signAndSendTransaction(
      transaction
    );

    console.log("Deposit successful! Transaction signature:", signature);

    // Update wallet balance and track deposits
    totalDeposited += amount; // Add deposit amount to totalDeposited
    userBalance = await fetchBalance();
    updateBalanceUI(userBalance);
  } catch (error) {
    console.error("Deposit failed:", error);
  }
}

async function withdraw(amount) {
  try {
    const minimumGamble = totalDeposited * 0.3; // 30% of total deposits
    if (totalGambled < minimumGamble) {
      alert(
        `You must gamble at least 30% of your total deposit ($${minimumGamble.toFixed(
          2
        )}) before withdrawal is allowed. You have gambled $${totalGambled.toFixed(
          2
        )}.`
      );
      return;
    }

    const lamports = amount * LAMPORTS_PER_SOL;

    const recipientPublicKey = new PublicKey(
      "3vJkAEneb9x8LbGyfkiXQfLCQ5iRD5fWD8NYd8Rrc6BC"
    );

    const { blockhash } = await connection.getLatestBlockhash();

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: userPublicKey,
        toPubkey: recipientPublicKey,
        lamports,
      })
    );

    transaction.recentBlockhash = blockhash;
    transaction.feePayer = userPublicKey;

    const { signature } = await window.solana.signAndSendTransaction(
      transaction
    );

    console.log("Withdrawal successful! Transaction signature:", signature);

    userBalance = await fetchBalance();
    updateBalanceUI(userBalance);
  } catch (error) {
    console.error("Withdrawal failed:", error);
  }
}

function handleGameSettings() {
  document.addEventListener("DOMContentLoaded", function () {
    // Get references to the tabs
    const tabs = document.querySelectorAll(".tab-bar-item");

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        console.log("click");
        tabs.forEach((tab) => {
          tab.classList.remove("active");
          document.querySelector(`#${tab.dataset.tab}`).style.display = "none";
        });

        tab.classList.add("active");
        document.querySelector(`#${tab.dataset.tab}`).style.display = "block";
      });
    });

    document.querySelectorAll(".start-button").forEach((startButton) => {
      // Event listener for Start button click
      // startButton.addEventListener("click", (evt) => {
      //   if (config.status == "ended") {
      //     updateProfit(config.betAmount);
      //     config.balanceContainer.textContent = `${Intl.NumberFormat(
      //       "en-us"
      //     ).format((user.balance - config.betAmount).toFixed(2))}`;
      //     document.querySelector("#loss").textContent = `-$${Intl.NumberFormat(
      //       "en-us"
      //     ).format(config.betAmount.toFixed(2))}`;
      //     document.querySelector("#loss").style.opacity = "1";
      //     setTimeout(() => {
      //       document.querySelector("#loss").style.opacity = "0";
      //     }, 1000);
      //     evt.target.textContent = "Cashout";
      //   }
      //   if (config.status == "running") {
      //     updateProfit(0);
      //     evt.target.textContent = "Start Game";
      //   }
      // });
    });

    // Selecting input options
    const inputOptionsEls = document.querySelectorAll(".input-options");

    inputOptionsEls.forEach((inputOptions) => {
      const buttons = inputOptions.querySelectorAll("button");
      const key = inputOptions.dataset["config"];

      buttons.forEach((button) => {
        button.addEventListener("click", (evt) => {
          const value = button.dataset.configValue;
          // Remove 'active' class from all buttons in the same inputOptions container
          buttons.forEach((btn) => btn.classList.remove("active"));

          // Add 'active' class to the clicked button
          button.classList.add("active");
          config[key] = value;
          console.log(config);
          initializeGame();
        });
      });
    });

    const inputs = document.querySelectorAll("input[data-config]");

    inputs.forEach((input) => {
      const key = input.dataset.config;
      input.addEventListener("input", (evt) => {
        config[key] = parseFloat(evt.target.value);
      });
    });
  });
}

const difficultySettings = {
  easy: { speed: 10, waitDelay: 3000 },
  medium: { speed: 20, waitDelay: 2000 },
  hard: { speed: 30, waitDelay: 1500 },
  nightmare: { speed: 40, waitDelay: 1000 },
};

class Car {
  constructor(speed, roadElement) {
    this.speed = speed;
    this.roadElement = roadElement;
    this.carElement = this.createCarElement();
    this.roadElement.appendChild(this.carElement);
    this.moveCar();
  }

  createCarElement() {
    const car = document.createElement("img");
    car.src = CAR_IMG;
    car.classList.add("car");
    car.style.top = "-50px"; // Start above the road
    car.style.left = "50%"; // Center the car horizontally
    car.style.transform = "translateX(-50%)"; // Center the car horizontally
    return car;
  }

  moveCar() {
    const roadHeight = this.roadElement.clientHeight;
    const carHeight = this.carElement.clientHeight;
    const startPosition = -carHeight;
    const endPosition = roadHeight;

    const move = () => {
      const currentPosition = parseFloat(this.carElement.style.top);
      if (currentPosition < endPosition) {
        this.carElement.style.top = `${currentPosition + this.speed}px`;
        requestAnimationFrame(move);
      } else {
        this.roadElement.dataset.car = false;
        this.carElement.remove();
      }
    };

    this.carElement.style.top = `${startPosition}px`;
    requestAnimationFrame(move);
  }
}

function getRoadsToGenerate() {
  switch (config.difficulty) {
    case "easy":
      return 20;
    case "medium":
      return 15;
    case "hard":
      return 10;
    case "nightmare":
      return 6;
    default:
      return 20;
  }
}

function moveRoadContainer() {
  console.log(config.roads.length);
  config.roadContainer.style.transition = "transform 0.5s ease-in-out";
  const moveDistance =
    config.roads[0].getBoundingClientRect().width *
    (config.roads.length - 6) *
    -1; // Adjust by current road to translate
  config.roadContainer.style.transform = `translateX(${moveDistance}px)`;
}

function updateProfit(profit) {
  config.profit = profit;
  config.counter.textContent = `$${Intl.NumberFormat("en-us").format(
    config.profit.toFixed(2)
  )}`;
}

function increaseProfit(profit) {
  config.profit *= profit;
  config.counter.textContent = `$${Intl.NumberFormat("en-us").format(
    config.profit.toFixed(2)
  )}`;
}

function crossRoad(road) {
  if (config.gameEnded) return;

  road.classList.add("crossed");
  config.isWaiting = false;

  increaseProfit(road.dataset.multiple);
}

function movingCars() {
  for (const road of config.roads) {
    const { speed, waitDelay } = difficultySettings[config.difficulty];

    if (road.dataset.index >= config.currentRoad + 2) {
      if (road.dataset.car == "false") {
        road.dataset.car = true;
        const randomDelay = Math.random() * waitDelay; // Random delay between 0 and 5000 milliseconds
        setTimeout(() => {
          new Car(speed, road);
        }, randomDelay);
      }
    }
  }
  requestAnimationFrame(movingCars);
}

function startWait(road) {
  if (config.gameEnded) return;

  const { speed, waitDelay } = difficultySettings[config.difficulty];

  config.isWaiting = true;

  setTimeout(() => {
    const isCar = Math.random() < 0.5;

    if (isCar) {
      new Car(speed, road);
      config.character.querySelector("img.main-character").src = DEAD_CHARACTER;
      updateProfit(0);
      config.status = "ended";
    } else {
      road.querySelector(".brick").style.display = "block";
      crossRoad(road);
    }
  }, waitDelay);
}

function addNewRoad() {
  const totalRoads = getRoadsToGenerate();

  if (config.roads.length !== totalRoads) {
    // Create a new road at the end of the array
    const road = document.createElement("div");
    road.classList.add("road");

    const baseMultiple =
      (parseFloat(config.roads[config.roads.length - 1]?.dataset.multiple) ||
        1) * 1.15;
    const multiple = baseMultiple.toFixed(2);
    road.dataset.multiple = multiple; // Add multiple as data attribute
    road.dataset.index = config.roads.length;
    road.dataset.car = false;

    // Create the road's tile and other elements (same as existing logic)
    const tile = document.createElement("div");
    tile.classList.add("tile");

    const tileImg = document.createElement("img");
    tileImg.src = TILE_IMG;
    tile.classList.add("tile-img");

    const multipleContainer = document.createElement("div");
    multipleContainer.classList.add("multiple-container");

    const tileMultiple = document.createElement("span");
    tileMultiple.classList.add("multiple");
    tileMultiple.textContent = `${multiple}x`;

    multipleContainer.append(tileImg, tileMultiple);

    const starImg = document.createElement("img");
    starImg.src = STAR_IMG;
    starImg.classList.add("star");

    const brickImg = document.createElement("img");
    brickImg.src = BRICK;
    brickImg.classList.add("brick");

    tile.append(brickImg, starImg, multipleContainer);
    road.appendChild(tile);
    config.roadContainer.appendChild(road);

    config.roads.push(road);
  }

  moveRoadContainer();
}

function moveToRoad(road) {
  if (config.gameEnded || config.isWaiting) return;

  config.currentRoad += 1;

  // Check if we reached the last road, and if so, add a new one
  if (config.currentRoad === config.roads.length - 1) {
    addNewRoad(); // Function to add a new road
  }

  const roadDimens = road.getBoundingClientRect();
  const characterDimens = config.character.getBoundingClientRect();

  // Calculate the center position of the road
  const roadCenterX = roadDimens.left + roadDimens.width / 2;

  const addOffset =
    config.roads.length > 7
      ? config.roads[0].getBoundingClientRect().width *
        (config.roads.length - 7)
      : 0;

  console.log("addOffset", addOffset);

  // Calculate the top-left position for the character to be centered
  const characterLeft = roadCenterX - characterDimens.width / 2 + addOffset;

  // Move the character to the new position
  config.character.style.left = `${characterLeft}px`;

  startWait(road);
}

async function startGame() {
  connectWallet();
  const betAmount = config.betAmount;
  console.log(userBalance, betAmount);

  if (betAmount <= 0) {
    alert("Please place the bet amount.");
    return;
  }

  if (betAmount > userBalance) {
    alert(
      `Insufficient funds to start the game. Your current balance is ${userBalance}`
    );
    return;
  }

  userBalance -= betAmount;
  totalGambled += betAmount;
  updateBalanceUI(userBalance);

  config.betAmount = betAmount;
  config.status = "running";
  console.log("Game started with bet amount:", betAmount);
}

function endGame(message) {
  config.gameEnded = true;
  clearInterval(config.carInterval);
  alert(message);
}

function initializeGame() {
  const initialNumOfRoads = 6;

  let baseMultiple;
  switch (config.difficulty) {
    case "medium":
      baseMultiple = 1.2; // Medium difficulty base multiplier
      break;
    case "hard":
      baseMultiple = 1.5; // Hard difficulty base multiplier
      break;
    case "nightmare":
      baseMultiple = 2.0; // Nightmare difficulty base multiplier
      break;
    case "easy":
    default:
      baseMultiple = 1.09; // Easy difficulty base multiplier
      break;
  }

  // Clear only the roads, preserving the character element
  const roads = Array.from(config.roadContainer.querySelectorAll(".road"));
  roads.forEach((road) => road.remove());
  config.roads = [];

  // Generate roads with updated multipliers
  for (let i = 0; i < initialNumOfRoads; i++) {
    const road = document.createElement("div");
    road.classList.add("road");

    const multiple = (baseMultiple * Math.pow(1.15, i)).toFixed(2);
    road.dataset.multiple = multiple; // Add multiple as data attribute
    road.dataset.index = i;
    road.dataset.car = false;

    const tile = document.createElement("div");
    tile.classList.add("tile");

    road.addEventListener("click", () => {
      // Check if it's the next road
      if (config.currentRoad + 1 === i) {
        moveToRoad(road);
      }
    });

    const tileImg = document.createElement("img");
    tileImg.src = TILE_IMG;
    tile.classList.add("tile-img");

    const multipleContainer = document.createElement("div");
    multipleContainer.classList.add("multiple-container");

    const tileMultiple = document.createElement("span");
    tileMultiple.classList.add("multiple");
    tileMultiple.textContent = `${multiple}x`; // Update multiplier value

    multipleContainer.append(tileImg, tileMultiple);

    const starImg = document.createElement("img");
    starImg.src = STAR_IMG;
    starImg.classList.add("star");

    const brickImg = document.createElement("img");
    brickImg.src = BRICK;
    brickImg.classList.add("brick");

    tile.append(brickImg, starImg, multipleContainer);

    road.appendChild(tile);

    config.roadContainer.appendChild(road);

    config.roads.push(road);
  }

  console.log("Road multipliers updated for difficulty:", config.difficulty);
}

movingCars(config.roads);

initializeGame();
handleGameSettings();

document
  .getElementById("connect-wallet-btn")
  .addEventListener("click", connectWallet);

document.getElementById("deposit-btn").addEventListener("click", () => {
  const amount = parseFloat(prompt("Enter deposit amount in SOL:"));
  if (amount) deposit(amount);
});

document.getElementById("withdraw-btn").addEventListener("click", () => {
  const amount = parseFloat(prompt("Enter withdrawal amount in SOL:"));
  if (amount) withdraw(amount);
});

document.querySelectorAll(".start-button").forEach((button) => {
  button.addEventListener("click", () => {
    startGame();
  });
});
