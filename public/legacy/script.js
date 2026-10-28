let seconds = 30;
let score = 0;
let countdownInterval;


//function to update countdown
function updateCountdown() {
        document.getElementById('timer').textContent = seconds;
        if (seconds > 0) {
            seconds-= 1;
            countdownInterval = setTimeout(updateCountdown, 1000);
        }
        else {
            clearTimeout(countdownInterval);
            displayResult(); // Show the modal when the timer reaches 0
        }
}

function displayResult() {
    document.getElementById('finalScore').textContent = score;
    const modal = document.getElementById('result');
    modal.style.display = "flex";
    document.getElementById('container').style.display = "none";
}

// function to create letter boxes
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(''); //split to turn to array

//get a random letter in the hitbox
let currentLetter = '';

function getRandomLetter() {
    const randomIndex = Math.floor(Math.random() * alphabet.length);
    return alphabet[randomIndex];
}

function displayRandomLetter() {
    currentLetter = getRandomLetter(); // Get a random letter and assign it to currentLetter
    const alphabetBox = document.getElementById('hitbox');
    alphabetBox.innerText = currentLetter; // Display the random letter in the box
    return currentLetter;
}

displayRandomLetter(); // Initialize with a random letter



function createBoxes() {
    const container = document.getElementById('container');
    container.innerHTML = '';

    // Shuffle the alphabet array
    const shuffledAlphabet = [...alphabet]; // Create a copy of the alphabet array so it does not affect the initial array
    shuffleArray(shuffledAlphabet); // Shuffle the copied array

    // Create boxes with shuffled letters
    shuffledAlphabet.forEach(letter => {
        const box = document.createElement('div');
        box.className = 'box';
        box.innerText = letter;

// Add onclick event to each box
    box.onclick = function() {
        if (seconds > 0) { // Ensure actions only if the timer is running
            if (letter === currentLetter) {
                // console.log('Matched! Shuffling...');
                score += 10; // Increment score by 10
                document.getElementById("scorebox").innerHTML = score; // Update score in the scorebox
                shuffleArray(alphabet);
                createBoxes(); // Recreate boxes after shuffle
                displayRandomLetter();
            }
        };
    }

    container.appendChild(box);
    });

}

// Helper function to shuffle an array (Fisher-Yates Shuffle)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function closeModal() {
    const modal = document.getElementById('result');
    modal.style.display = "none";
    document.getElementById('container').style.display = "flex";
    restartGame(); // Restart the game
}

function restartGame() {
    score = 0;
    seconds = 30;
    document.getElementById("scorebox").innerHTML = score;
    document.getElementById('timer').textContent = seconds; 
    createBoxes();
    displayRandomLetter();
    updateCountdown(); // Start the countdown again
}

function startGame(){
    document.getElementById("holder").style.display = "flex";
    document.getElementById("about").style.display = "none";
    restartGame();
}
// Initialize boxes and display a random letter
createBoxes();
displayRandomLetter();