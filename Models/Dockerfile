# Use a standard Python image
FROM python:3.9-slim

# Set the working directory inside the container
WORKDIR /code

# Copy the requirements file first to leverage Docker cache
COPY requirements.txt .

# Install the Python dependencies
RUN pip install --no-cache-dir --upgrade -r requirements.txt

# Copy all your application files (ml_api.py, .pkl files, etc.)
COPY . .

# Expose the port the app will run on
EXPOSE 7860

# Command to run your application using gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:7860", "ml_api:app"]

