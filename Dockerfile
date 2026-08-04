FROM python:3.9

WORKDIR /code

COPY ./requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

COPY ./api /code/api

# Hugging Face berjalan sebagai user 1000, bukan root.
RUN useradd -m -u 1000 user
RUN chown -R user:user /code
USER user

# Hugging Face menggunakan port 7860 secara default
CMD ["uvicorn", "api.app:app", "--host", "0.0.0.0", "--port", "7860"]
