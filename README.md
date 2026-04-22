# CITS5505_AgileWebDev
Repository for CITS5505 26S1 group project.

**Purpose of the application:** 
to be finished

**Group members:**
| UWA ID   | Name                      | User Name          |
|----------|---------------------------|--------------------|
| 24496192 | Navdeep Singh             | navdeep077         |
| 24366018 | Evan Zhao                 | itsEvanZHAO        |
| 24765784 | Nimit Sureshbhai Gelani   | Fighterdx          |
| 24681985 | Jaswanth Vericherla       | jaswanth-kumar24   |

## Technologies Used
- Frontend: HTML, CSS, JavaScript (Bootstrap)  
- Backend: Python (Flask)  
- Version Control: Git & GitHub  

## Project Structure
```text
CITS5505_AgileWebDev/
├── app.py
├── requirements.txt
├── .gitignore
├── README.md
├── templates/
│   ├── brew.html
│   ├── navbar.html
│   ├── profile.html
│   └── ... other HTML templates
├── static/
│   ├── css/
│   ├── js/
│   └── images/
```
## Setup Instructions (Run Locally)

1. Clone the repository:

```bash
git clone https://github.com/itsEvanZHAO/CITS5505_AgileWebDev/
cd CITS5505_AgileWebDev
```

2. Create virtual environment:

```bash
python3 -m venv venv
```

3. Activate environment:

```bash
# Mac/Linux
source venv/bin/activate

# Windows
venv\Scripts\activate
```

4. Install dependencies:

```bash
pip install -r requirements.txt
```

5. Run the application:

```bash
python3 app.py
```

6. Open in browser:

```bash
http://127.0.0.1:5000
```
## Git Workflow
- Do not work directly on `main`  
- Create a feature branch:

git checkout -b feat/your-feature-name

- Commit and push changes:

git add .
git commit -m "feat: your message"
git push

- Create a Pull Request on GitHub  

## Project Rules
- Minimum 2 reviewers required before merging  
- Use proper commit message conventions (`feat`, `fix`, `refactor`)  
- Keep code clean and organised  
- Do not push `venv/`
