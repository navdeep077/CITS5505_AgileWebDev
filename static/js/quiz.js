/*
 * quiz.js
 * Coffee personality quiz — 6 questions, 4 personality results
 */

const QUESTIONS = [
    {
        q: "What time do you usually have your first coffee?",
        options: ["Before 7am", "7–9am", "9–11am", "After 11am"],
        scores:  [4, 3, 2, 1]
    },
    {
        q: "How do you take your coffee?",
        options: ["Black, always", "A dash of milk", "Latte or flat white", "Sweet and creamy"],
        scores:  [4, 3, 2, 1]
    },
    {
        q: "Where is your ideal coffee spot?",
        options: ["Home with my own setup", "A specialty roastery", "A cosy neighbourhood cafe", "Anywhere with free wifi"],
        scores:  [4, 3, 2, 1]
    },
    {
        q: "How many coffees do you drink per day?",
        options: ["4 or more", "2–3", "Just one", "I sometimes skip it"],
        scores:  [4, 3, 2, 1]
    },
    {
        q: "What matters most in a cafe?",
        options: ["Bean origin and roast profile", "Quality of the espresso", "The atmosphere and vibe", "Price and convenience"],
        scores:  [4, 3, 2, 1]
    },
    {
        q: "What do you do while drinking coffee?",
        options: ["Nothing — I focus on the taste", "Read or journal", "Chat with friends", "Work or study"],
        scores:  [4, 3, 2, 1]
    }
];

const RESULTS = [
    {
        min:   20,
        emoji: "🏆",
        title: "The Grand Master Barista",
        desc:  "Coffee is your craft, your religion and your identity. You know your single origins from your blends, and you judge every cup with the precision of a Q-grader."
    },
    {
        min:   14,
        emoji: "☕",
        title: "The Specialty Devotee",
        desc:  "You appreciate quality above all else. You have favourite roasters, a preferred brew method, and strong opinions about extraction ratios."
    },
    {
        min:   8,
        emoji: "🌿",
        title: "The Cafe Social Butterfly",
        desc:  "For you coffee is about the experience — the people, the ambience, and the ritual. You love a good flat white and a catch-up with friends."
    },
    {
        min:   0,
        emoji: "⚡",
        title: "The Caffeine Pragmatist",
        desc:  "You need coffee to function, full stop. You are not fussy — you just need it strong, fast and available."
    }
];

let currentQ  = 0;
let totalScore = 0;

function renderQuestion() {
    const q = QUESTIONS[currentQ];
    document.getElementById('quiz-question').textContent = q.q;
    document.getElementById('q-current').textContent = currentQ + 1;
    document.getElementById('q-total').textContent   = QUESTIONS.length;
    document.getElementById('quiz-progress').style.width =
        ((currentQ / QUESTIONS.length) * 100) + '%';

    document.getElementById('quiz-options').innerHTML = q.options.map((opt, i) => `
        <button onclick="selectOption(${q.scores[i]})" class="quiz-option-btn">
            ${opt}
        </button>
    `).join('');
}

function selectOption(score) {
    totalScore += score;
    currentQ++;

    if (currentQ >= QUESTIONS.length) {
        showResult();
    } else {
        // Animate card transition
        const card = document.getElementById('quiz-card');
        card.style.opacity = '0';
        card.style.transform = 'translateX(20px)';
        setTimeout(() => {
            renderQuestion();
            card.style.transition = 'opacity 0.25s, transform 0.25s';
            card.style.opacity = '1';
            card.style.transform = 'translateX(0)';
        }, 200);
    }
}

function showResult() {
    document.getElementById('quiz-progress').style.width = '100%';
    document.getElementById('quiz-card').style.display  = 'none';

    const result = RESULTS.find(r => totalScore >= r.min) || RESULTS[RESULTS.length - 1];
    document.getElementById('result-emoji').textContent = result.emoji;
    document.getElementById('result-title').textContent = result.title;
    document.getElementById('result-desc').textContent  = result.desc;
    document.getElementById('quiz-result').style.display = 'block';
}

function restartQuiz() {
    currentQ   = 0;
    totalScore = 0;
    document.getElementById('quiz-card').style.display   = 'block';
    document.getElementById('quiz-result').style.display = 'none';
    renderQuestion();
}

// Start quiz
renderQuestion();