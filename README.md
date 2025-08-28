# Mental Math Practice

An interactive web application for practicing mental math with various modes of operation. Currently hosted here: mental-math-practice.vercel.app

## Features

- Multiple practice modes:
  - 1-3 digit Addition and Multiplication
  - Matrix Addition and Multiplication
  - Vector Dot product
- Score tracking
- Streak counter
- Timer for each question
- Immediate feedback

## Installation

1. Clone this repository
2. Install the required packages:
   ```bash
   pip install -r requirements.txt
   ```

## Running the Application

1. Navigate to the project directory
2. Run the Flask application:
   ```bash
   python app.py
   ```
3. Open your browser and go to `http://localhost:5000`

## Adding New Modes

To add new modes, modify the `MODES` dictionary in `app.py`. Each mode requires:
- A unique identifier
- A name
- Minimum and maximum values for number generation
- An operation ('+' or '*')

Example:
```python
MODES['addition_4'] = MathMode('4-digit Addition', 1000, 9999, '+')
