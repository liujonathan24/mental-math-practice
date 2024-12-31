from flask import Flask, render_template, jsonify
import random

app = Flask(__name__)

class MathMode:
    def __init__(self, name, min_val, max_val, operation, mode_type='scalar', matrix_sizes=None, difficulty=None):
        self.name = name
        self.min_val = min_val
        self.max_val = max_val
        self.operation = operation
        self.mode_type = mode_type
        self.matrix_sizes = matrix_sizes
        self.difficulty = difficulty

    def generate_matrix(self, rows, cols):
        return [[random.randint(self.min_val, self.max_val) for _ in range(cols)] for _ in range(rows)]

    def format_matrix(self, matrix):
        if not matrix:
            return "[]"
        rows = len(matrix)
        cols = len(matrix[0])
        
        # Get the maximum width needed for each column
        col_widths = [max(len(str(matrix[i][j])) for i in range(rows)) for j in range(cols)]
        
        # Format each row
        formatted_rows = []
        for i in range(rows):
            row_str = ' '.join(str(matrix[i][j]).rjust(col_widths[j]) for j in range(cols))
            formatted_rows.append(row_str)
            
        # Get the maximum row width
        max_width = max(len(row) for row in formatted_rows)
        
        # Create the matrix string with brackets
        result = []
        for i, row in enumerate(formatted_rows):
            if i == 0:
                result.append("⎡" + row.ljust(max_width) + "⎤")
            elif i == rows - 1:
                result.append("⎣" + row.ljust(max_width) + "⎦")
            else:
                result.append("⎢" + row.ljust(max_width) + "⎥")
        return "\n".join(result)

    def generate_question(self):
        if self.mode_type == 'scalar':
            num1 = random.randint(self.min_val, self.max_val)
            num2 = random.randint(self.min_val, self.max_val)
            if self.operation == '+':
                answer = num1 + num2
                question = f"{num1} + {num2}"
            elif self.operation == '*':
                answer = num1 * num2
                question = f"{num1} × {num2}"
            return {"question": question, "answer": answer, "mode_type": self.mode_type}
        else:  # matrix
            if not self.matrix_sizes:
                raise ValueError("Matrix sizes not specified")
                
            # Select random matrix size based on difficulty
            rows, cols = random.choice(self.matrix_sizes)
            
            if self.operation == '+':
                matrix1 = self.generate_matrix(rows, cols)
                matrix2 = self.generate_matrix(rows, cols)
                answer = [[matrix1[i][j] + matrix2[i][j] for j in range(cols)] for i in range(rows)]
                
                # Format matrices side by side
                matrix1_str = self.format_matrix(matrix1)
                matrix2_str = self.format_matrix(matrix2)
                
                # Split matrices into lines and combine side by side
                matrix1_lines = matrix1_str.split('\n')
                matrix2_lines = matrix2_str.split('\n')
                
                question = "Add matrices:\n"
                for i in range(len(matrix1_lines)):
                    question += f"{matrix1_lines[i]}    +    {matrix2_lines[i]}\n"
                    
            else:  # multiplication
                # For multiplication, we need the inner dimensions to match
                mid = random.randint(2, 3) if self.difficulty == 'hard' else 2
                matrix1 = self.generate_matrix(rows, mid)
                matrix2 = self.generate_matrix(mid, cols)
                
                # Compute matrix multiplication
                answer = [[sum(matrix1[i][k] * matrix2[k][j] for k in range(mid))
                          for j in range(cols)] for i in range(rows)]
                
                # Format matrices side by side
                matrix1_str = self.format_matrix(matrix1)
                matrix2_str = self.format_matrix(matrix2)
                
                # Split matrices into lines and combine side by side
                matrix1_lines = matrix1_str.split('\n')
                matrix2_lines = matrix2_str.split('\n')
                
                question = "Multiply matrices:\n"
                for i in range(len(matrix1_lines)):
                    question += f"{matrix1_lines[i]}    ×    {matrix2_lines[i]}\n"

            return {
                "question": question,
                "answer": answer,
                "mode_type": self.mode_type,
                "dimensions": {
                    "rows": rows,
                    "cols": cols if self.operation == '+' else cols
                }
            }

# Define matrix sizes for different difficulties
MATRIX_SIZES = {
    'easy': [(2, 2)],
    'medium': [(2, 2), (2, 3), (3, 2)],
    'hard': [(2, 3), (3, 2), (3, 3)]
}

# Define available modes
MODES = {
    'scalar_addition': {
        'name': 'Scalar Addition',
        'digits': {
            '1': MathMode('1-digit Addition', 0, 9, '+'),
            '2': MathMode('2-digit Addition', 10, 99, '+'),
            '3': MathMode('3-digit Addition', 100, 999, '+')
        }
    },
    'scalar_multiplication': {
        'name': 'Scalar Multiplication',
        'digits': {
            '1': MathMode('1-digit Multiplication', 0, 9, '*'),
            '2': MathMode('2-digit Multiplication', 10, 99, '*'),
            '3': MathMode('3-digit Multiplication', 100, 999, '*')
        }
    },
    'matrix_addition': {
        'name': 'Matrix Addition',
        'difficulties': {
            'easy': MathMode('Easy Matrix Addition', -5, 5, '+', 'matrix', MATRIX_SIZES['easy'], 'easy'),
            'medium': MathMode('Medium Matrix Addition', -10, 10, '+', 'matrix', MATRIX_SIZES['medium'], 'medium'),
            'hard': MathMode('Hard Matrix Addition', -20, 20, '+', 'matrix', MATRIX_SIZES['hard'], 'hard')
        }
    },
    'matrix_multiplication': {
        'name': 'Matrix Multiplication',
        'difficulties': {
            'easy': MathMode('Easy Matrix Multiplication', 0, 5, '*', 'matrix', MATRIX_SIZES['easy'], 'easy'),
            'medium': MathMode('Medium Matrix Multiplication', -5, 5, '*', 'matrix', MATRIX_SIZES['medium'], 'medium'),
            'hard': MathMode('Hard Matrix Multiplication', -10, 10, '*', 'matrix', MATRIX_SIZES['hard'], 'hard')
        }
    }
}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/modes')
def get_modes():
    return jsonify({
        mode_id: {
            'name': mode_info['name'],
            'has_digits': 'digits' in mode_info,
            'has_difficulties': 'difficulties' in mode_info
        }
        for mode_id, mode_info in MODES.items()
    })

@app.route('/api/mode/<mode_id>/digits')
def get_digits(mode_id):
    if mode_id not in MODES or 'digits' not in MODES[mode_id]:
        return jsonify({'error': 'Invalid mode or no digits available'}), 400
    return jsonify({
        digit: mode.name
        for digit, mode in MODES[mode_id]['digits'].items()
    })

@app.route('/api/mode/<mode_id>/difficulties')
def get_difficulties(mode_id):
    if mode_id not in MODES or 'difficulties' not in MODES[mode_id]:
        return jsonify({'error': 'Invalid mode or no difficulties available'}), 400
    return jsonify({
        diff: mode.name
        for diff, mode in MODES[mode_id]['difficulties'].items()
    })

@app.route('/api/question/<mode_id>/<setting>')
def get_question(mode_id, setting):
    if mode_id not in MODES:
        return jsonify({'error': 'Invalid mode'}), 400
        
    mode_info = MODES[mode_id]
    if 'digits' in mode_info:
        if setting not in mode_info['digits']:
            return jsonify({'error': 'Invalid digits'}), 400
        mode = mode_info['digits'][setting]
    elif 'difficulties' in mode_info:
        if setting not in mode_info['difficulties']:
            return jsonify({'error': 'Invalid difficulty'}), 400
        mode = mode_info['difficulties'][setting]
    else:
        mode = mode_info['mode']
        
    return jsonify(mode.generate_question())

if __name__ == '__main__':
    app.run(debug=True)
