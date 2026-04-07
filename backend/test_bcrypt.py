import bcrypt
def get_password_hash(password):
    if isinstance(password, str):
        password = password.encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password, salt).decode('utf-8')

def verify_password(plain_password, hashed_password):
    if isinstance(hashed_password, str):
        hashed_password = hashed_password.encode('utf-8')
    if isinstance(plain_password, str):
        plain_password = plain_password.encode('utf-8')
    try:
        return bcrypt.checkpw(plain_password, hashed_password)
    except ValueError as e:
        return f"Error: {e}"

p = "password123"
h = get_password_hash(p)
v = verify_password(p, h)
print(f"Password: {p}")
print(f"Hash: {h}")
print(f"Verified: {v}")

# Test with a known bug: what if the hash string is slightly different in DB?
# E.g. trailing newline or whitespace?
v_strip = verify_password(p, h + " ")
print(f"Verified with space: {v_strip}")
