from flask import (
    Flask,
    request,
    jsonify,
    send_from_directory,
    render_template,
    redirect,
    url_for,
    session
)
from werkzeug.utils import secure_filename
from flask_cors import CORS
import hashlib
import secrets
import pickle
import json
import time
import os

app = Flask(__name__)
CORS(app)
app.secret_key = '4adf1be550d8f521b491bd9cdf821a4351da63a6edfec11c8d64ab670784ffba'

# --- User and server data ---
USERS_PATH = os.path.join(os.path.dirname(__file__), 'accounts.json')
SERVERS_PATH = os.path.join(os.path.dirname(__file__), 'servers.json')
TOKENS_PATH = os.path.join(os.path.dirname(__file__), 'tokens.json')
FRIENDS_PATH = os.path.join(os.path.dirname(__file__), 'friends.json')
DMS_PATH = os.path.join(os.path.dirname(__file__), 'dms.json')
INVITES_PATH = os.path.join(os.path.dirname(__file__), 'invites.json')
FILES_DIRS = [
    os.path.join(os.path.dirname(__file__), 'files'),
    os.path.join(os.path.dirname(__file__), '../files'),
]

ALLOWED_AVATAR_EXTENSIONS = {"png", "jpg", "jpeg", "gif"}
AVATAR_DIR = os.path.join(os.path.dirname(__file__), 'avatars')
os.makedirs(AVATAR_DIR, exist_ok=True)

# Load or initialize users

def load_users():
    if os.path.exists(USERS_PATH):
        with open(USERS_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_users(users):
    with open(USERS_PATH, 'w', encoding='utf-8') as f:
        json.dump(users, f)

# Load or initialize servers

def load_servers():
    if os.path.exists(SERVERS_PATH):
        with open(SERVERS_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_servers(servers):
    with open(SERVERS_PATH, 'w', encoding='utf-8') as f:
        json.dump(servers, f)

# Token management

def load_tokens():
    if os.path.exists(TOKENS_PATH):
        with open(TOKENS_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_tokens(tokens):
    with open(TOKENS_PATH, 'w', encoding='utf-8') as f:
        json.dump(tokens, f)

# Friends management
def load_friends():
    if os.path.exists(FRIENDS_PATH):
        with open(FRIENDS_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {
        "friends": {},      # username -> list of friends
        "requests": {}      # username -> list of pending requests
    }

def save_friends(friends_data):
    with open(FRIENDS_PATH, 'w', encoding='utf-8') as f:
        json.dump(friends_data, f)

# DMs management
def load_dms():
    if os.path.exists(DMS_PATH):
        with open(DMS_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {
        "direct": {},       # dm_id -> {users: [], messages: {}}
        "groups": {}        # group_id -> {name, owner, users: [], messages: {}}
    }

def save_dms(dms_data):
    with open(DMS_PATH, 'w', encoding='utf-8') as f:
        json.dump(dms_data, f)

# Server invites management
def load_invites():
    if os.path.exists(INVITES_PATH):
        with open(INVITES_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}  # code -> {server_id, created_by, expires_at}

def save_invites(invites_data):
    with open(INVITES_PATH, 'w', encoding='utf-8') as f:
        json.dump(invites_data, f)

def allowed_avatar(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_AVATAR_EXTENSIONS

@app.errorhandler(404)
def not_found(error):
    return render_template('404.html'), 404

@app.route('/')
def index():
    if 'username' in session:
        return redirect(url_for('app_page'))
    return redirect(url_for('login_page'))

@app.route('/login', methods=['GET', 'POST'])
def login_page():
    if request.method == 'POST':
        app.logger.info("Processing login form submission")
        users = load_users()
        username = request.form.get('username')
        password = request.form.get('password')
        if not username or not password:
            app.logger.warning("Missing credentials in login form")
            return render_template('login.html', error='Missing credentials')
        if users.get(username) == hashlib.md5(password.encode()).hexdigest():
            session['username'] = username
            app.logger.info(f"User {username} logged in successfully")
            return redirect(url_for('app_page'))
        app.logger.warning(f"Invalid credentials for user: {username}")
        return render_template('login.html', error='Invalid credentials')
    if 'username' in session:
        app.logger.info("User already logged in. Redirecting to /app")
        return redirect(url_for('app_page'))
    app.logger.info("Rendering login page")
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('username', None)
    return redirect(url_for('login_page'))

@app.route('/register', methods=['GET', 'POST'])
def register_page():
    if request.method == 'POST':
        users = load_users()
        username = request.form.get('username')
        password = request.form.get('password')
        if not username or not password:
            return render_template('register.html', error='Missing credentials')
        if username in users:
            return render_template('register.html', error='User already exists')
        users[username] = hashlib.md5(password.encode()).hexdigest()
        save_users(users)
        session['username'] = username
        return redirect(url_for('app_page'))
    return render_template('register.html')

@app.route('/app')
def app_page():
    app.logger.info("Accessing /app route")
    if 'username' not in session:
        app.logger.warning("No session found. Redirecting to /login")
        return redirect(url_for('login_page'))

    username = session['username']
    app.logger.info(f"Session found for user: {username}")

    # Generate or get an existing token for the user
    tokens = load_tokens()
    found_token = None

    # Look for existing token for this user
    for token, user in tokens.items():
        if user == username:
            found_token = token
            break

    # No token found, create a new one
    if not found_token:
        import secrets
        found_token = secrets.token_hex(32)
        tokens[found_token] = username
        save_tokens(tokens)
        app.logger.info(f"Generated new token for user: {username}")

    app.logger.info(f"Rendering app.html for user: {username}")
    return render_template('app.html', username=username, token=found_token)

@app.route('/upload_avatar', methods=['POST'])
def upload_avatar():
    token = request.form.get('token')
    tokens = load_tokens()
    username = tokens.get(token)
    if not username:
        return jsonify({'status': 'INVALID'}), 401
    if 'avatar' not in request.files:
        return jsonify({'status': 'NO_FILE'}), 400
    file = request.files['avatar']
    if file.filename == '':
        return jsonify({'status': 'NO_FILE'}), 400
    if not allowed_avatar(file.filename):
        return jsonify({'status': 'INVALID_TYPE'}), 400
    filename = secure_filename(f'{username}.{file.filename.rsplit(",", 1)[-1]}')
    path = os.path.join(AVATAR_DIR, filename)
    file.save(path)
    return jsonify({'status': 'OK', 'avatar': filename})

@app.route('/avatar/<username>')
def get_avatar(username):
    for ext in ALLOWED_AVATAR_EXTENSIONS:
        path = os.path.join(AVATAR_DIR, f'{username}.{ext}')
        if os.path.exists(path):
            return send_from_directory(AVATAR_DIR, f'{username}.{ext}')
    return send_from_directory(FILES_DIRS[0], 'default/server.png')

@app.route('/login', methods=['POST'])
def login():
    try:
        users = load_users()
        data = request.json

        if not data:
            # Handle case when request doesn't have JSON data
            app.logger.error("Login error: No JSON data in request")
            return jsonify({'status': 'INVALID', 'message': 'Invalid request format'}), 400

        username = data.get('username')
        password = data.get('password')

        if not username or not password:
            app.logger.error(f"Login error: Missing credentials")
            return jsonify({'status': 'INVALID', 'message': 'Missing credentials'}), 400

        if users.get(username) == hashlib.md5(password.encode()).hexdigest():
            # Generate token
            token = secrets.token_hex(32)
            tokens = load_tokens()
            tokens[token] = username
            save_tokens(tokens)

            # Set session for web routes
            session['username'] = username

            app.logger.info(f"User '{username}' logged in successfully")
            return jsonify({'status': 'OK', 'token': token})

        app.logger.warning(f"Failed login attempt for user '{username}'")
        return jsonify({'status': 'INVALID', 'message': 'Invalid credentials'}), 401
    except Exception as e:
        app.logger.error(f"Login error: {str(e)}")
        return jsonify({'status': 'ERROR', 'message': 'Server error during login'}), 500

@app.route('/register', methods=['POST'])
def register():
    users = load_users()
    tokens = load_tokens()
    servers = load_servers()
    data = request.json
    username = data.get('username')
    password = data.get('password')
    if not username or not password:
        return jsonify({'status': 'INVALID'}), 400
    if username in users:
        return jsonify({'status': 'EXISTS'}), 409
    users[username] = hashlib.md5(password.encode()).hexdigest()
    for s in servers.values():
        if 'test' in s['name'].lower() and username not in s['users']:
            s['users'].append(username)
    save_users(users)
    save_servers(servers)
    # Generate token
    token = secrets.token_hex(32)
    tokens[token] = username
    save_tokens(tokens)
    return jsonify({'status': 'OK', 'token': token})

@app.route('/validate_token', methods=['POST'])
def validate_token():
    tokens = load_tokens()
    data = request.json
    token = data.get('token')
    if token in tokens:
        return jsonify({'status': 'OK'})
    return jsonify({'status': 'INVALID'}), 401

@app.route('/get_username', methods=['POST'])
def get_username():
    tokens = load_tokens()
    data = request.json
    token = data.get('token')
    username = tokens.get(token)
    if username:
        return jsonify({'username': username})
    return jsonify({'username': None}), 401

@app.route('/servers', methods=['GET'])
def get_servers():
    token = request.args.get('token')
    tokens = load_tokens()
    username = tokens.get(token)
    if not username:
        return jsonify({'status': 'INVALID'}), 401
    servers = load_servers()
    # Optionally filter servers by user membership
    user_servers = {sid: s for sid, s in servers.items() if username in s.get('users', [])}
    return jsonify(user_servers)

@app.route('/channels', methods=['GET'])
def get_channels():
    token = request.args.get('token')
    tokens = load_tokens()
    username = tokens.get(token)
    if not username:
        return jsonify({'status': 'INVALID'}), 401
    server_id = request.args.get('server_id')
    servers = load_servers()
    if server_id in servers:
        return jsonify(servers[server_id].get('channels', {}))
    return jsonify({})

@app.route('/messages', methods=['GET'])
def get_messages():
    token = request.args.get('token')
    tokens = load_tokens()
    username = tokens.get(token)
    if not username:
        return jsonify({'status': 'INVALID'}), 401

    server_id = request.args.get('server_id')
    channel_id = request.args.get('channel_id')
    since_timestamp = request.args.get('since', 0)

    try:
        since_timestamp = int(since_timestamp)
    except:
        since_timestamp = 0

    servers = load_servers()
    if server_id in servers and channel_id in servers[server_id]['channels']:
        messages = servers[server_id]['channels'][channel_id].get('messages', {})

        # If 'since' parameter is provided, only return newer messages
        if since_timestamp > 0:
            filtered_messages = {}
            for mid, msg in messages.items():
                if msg.get('timestamp', 0) > since_timestamp:
                    filtered_messages[mid] = msg
            return jsonify(filtered_messages)

        return jsonify(messages)
    return jsonify({})

@app.route('/send_message', methods=['POST'])
def send_message():
    data = request.json
    token = data.get('token')
    tokens = load_tokens()
    username = tokens.get(token)
    if not username:
        return jsonify({'status': 'INVALID'}), 401

    server_id = data.get('server_id')
    channel_id = data.get('channel_id')
    content = data.get('content')
    servers = load_servers()

    if server_id in servers and channel_id in servers[server_id]['channels']:
        channel = servers[server_id]['channels'][channel_id]
        messages = channel.get('messages', {})
        if not messages:
            channel['messages'] = {}
            messages = channel['messages']

        # Generate new message ID
        mid = hash(f'{server_id}{channel_id}{time.time()}')

        # Add timestamp to message
        import time
        timestamp = int(time.time() * 1000)  # Milliseconds since epoch

        # Store the message
        messages[mid] = {
            'author': username,
            'content': content,
            'timestamp': timestamp
        }

        save_servers(servers)
        return jsonify({'status': 'OK', 'message_id': mid})

    return jsonify({'status': 'INVALID'}), 400

@app.route('/send_group_message', methods=['POST'])
def send_group_message():
    data = request.json
    token = data.get('token')
    tokens = load_tokens()
    username = tokens.get(token)

    if not username:
        return jsonify({'status': 'INVALID'}), 401

    group_id = data.get('group_id')
    content = data.get('content')

    if not group_id or not content:
        return jsonify({'status': 'INVALID'}), 400

    # Load DMs data
    dms_data = load_dms()

    # Check if group exists
    if group_id not in dms_data.get('groups', {}):
        return jsonify({'status': 'NOT_FOUND'}), 404

    group = dms_data['groups'][group_id]

    # Check if user is a member of the group
    if username not in group.get('users', []):
        return jsonify({'status': 'FORBIDDEN'}), 403

    # Get messages or initialize if needed
    messages = group.get('messages', {})
    if not messages:
        group['messages'] = {}
        messages = group['messages']

    # Generate message ID
    mid = str(max([int(k) for k in messages.keys()] + [0]) + 1)

    # Add timestamp
    timestamp = int(time.time() * 1000)  # Milliseconds since epoch

    # Store the message
    messages[mid] = {
        'author': username,
        'content': content,
        'timestamp': timestamp
    }

    save_dms(dms_data)

    return jsonify({
        'status': 'OK',
        'group_id': group_id,
        'message_id': mid
    })

@app.route('/create_server', methods=['POST'])
def create_server():
    data = request.json
    token = data.get('token')
    tokens = load_tokens()
    username = tokens.get(token)

    if not username:
        return jsonify({'status': 'INVALID'}), 401

    server_id = str(max([int(k) for k in servers.keys()] + [0]) + 1)
    name = data.get('name', f'Server {server_id}')
    icon = data.get('icon', 'server.png')
    servers[server_id] = {
        'name': name,
        'icon': icon,
        'owner': username,
        'users': [username],
        'channels': {}
    }
    save_servers(servers)
    return jsonify({'status': 'OK', 'server_id': server_id})

@app.route('/create_channel', methods=['POST'])
def create_channel():
    data = request.json
    token = data.get('token')
    tokens = load_tokens()
    username = tokens.get(token)

    if not username:
        return jsonify({'status': 'INVALID'}), 401

    server_id = data.get('server_id')
    name = data.get('name')
    description = data.get('description', '')
    servers = load_servers()
    if server_id not in servers:
        return jsonify({'status': 'INVALID'}), 400
    channels = servers[server_id]['channels']
    channel_id = hash(f'{name}{description}{time.time()}')
    channels[channel_id] = {'name': name, 'description': description, 'messages': {}}
    save_servers(servers)
    return jsonify({'status': 'OK', 'channel_id': channel_id})

@app.route('/delete_channel', methods=['POST'])
def delete_channel():
    data = request.json
    token = data.get('token')
    tokens = load_tokens()
    username = tokens.get(token)

    if not username:
        return jsonify({'status': 'INVALID'}), 401

    server_id = data.get('server_id')
    channel_id = data.get('channel_id')
    servers = load_servers()
    if server_id not in servers or channel_id not in servers[server_id]['channels']:
        return jsonify({'status': 'INVALID'}), 400
    del servers[server_id]['channels'][channel_id]
    save_servers(servers)
    return jsonify({'status': 'OK'})

@app.route('/edit_message', methods=['POST'])
def edit_message():
    data = request.json
    token = data.get('token')
    tokens = load_tokens()
    username = tokens.get(token)

    if not username:
        return jsonify({'status': 'INVALID'}), 401

    server_id = data.get('server_id')
    channel_id = data.get('channel_id')
    message_id = data.get('message_id')
    new_content = data.get('content')
    servers = load_servers()
    if server_id in servers and channel_id in servers[server_id]['channels']:
        messages = servers[server_id]['channels'][channel_id].get('messages', {})
        msg = messages.get(message_id)
        if msg and msg['author'] == username:
            msg['content'] = new_content
            save_servers(servers)
            return jsonify({'status': 'OK'})
    return jsonify({'status': 'INVALID'}), 400

@app.route('/delete_message', methods=['POST'])
def delete_message():
    data = request.json
    token = data.get('token')
    tokens = load_tokens()
    username = tokens.get(token)

    if not username:
        return jsonify({'status': 'INVALID'}), 401

    server_id = data.get('server_id')
    channel_id = data.get('channel_id')
    message_id = data.get('message_id')
    servers = load_servers()
    if server_id in servers and channel_id in servers[server_id]['channels']:
        messages = servers[server_id]['channels'][channel_id].get('messages', {})
        msg = messages.get(message_id)
        if msg and msg['author'] == username:
            del messages[message_id]
            save_servers(servers)
            return jsonify({'status': 'OK'})
    return jsonify({'status': 'INVALID'}), 400

@app.route('/get_settings', methods=['GET'])
def get_settings():
    token = request.args.get('token')
    tokens = load_tokens()
    username = tokens.get(token)

    if not username:
        return jsonify({'status': 'INVALID'}), 401
    
    # Load user settings from file
    settings_dir = os.path.join(os.path.dirname(__file__), 'settings')
    os.makedirs(settings_dir, exist_ok=True)
    settings_path = os.path.join(settings_dir, f'{username}.json')
    
    if os.path.exists(settings_path):
        with open(settings_path, 'r', encoding='utf-8') as f:
            settings = json.load(f)
    else:
        # Default settings
        settings = {
            'theme': 'dark',
            'messageLayout': 'cozy',
            'notifications': True,
            'status': 'online'
        }
    
    return jsonify(settings)

@app.route('/save_settings', methods=['POST'])
def save_settings():
    data = request.json
    token = data.get('token')
    tokens = load_tokens()
    username = tokens.get(token)
    settings = data.get('settings', {})

    if not username:
        return jsonify({'status': 'INVALID'}), 401
    
    # Save user settings to file
    settings_dir = os.path.join(os.path.dirname(__file__), 'settings')
    os.makedirs(settings_dir, exist_ok=True)
    settings_path = os.path.join(settings_dir, f'{username}.json')
    
    with open(settings_path, 'w', encoding='utf-8') as f:
        json.dump(settings, f)
    
    return jsonify({'status': 'OK'})

@app.route('/get_profile', methods=['GET'])
def get_profile():
    token = request.args.get('token')
    tokens = load_tokens()
    requesting_user = tokens.get(token)
    username = request.args.get('username')

    if not requesting_user:
        return jsonify({'status': 'INVALID'}), 401
    
    if not username:
        # Default to the current user's profile if no username is provided
        username = requesting_user
    
    # Load user profile from file
    profiles_dir = os.path.join(os.path.dirname(__file__), 'profiles')
    os.makedirs(profiles_dir, exist_ok=True)
    profile_path = os.path.join(profiles_dir, f'{username}.json')
    
    if os.path.exists(profile_path):
        with open(profile_path, 'r', encoding='utf-8') as f:
            profile = json.load(f)
    else:
        # Default profile
        profile = {
            'description': 'No description available.'
        }
    
    return jsonify(profile)

@app.route('/save_profile', methods=['POST'])
def save_profile():
    data = request.json
    token = data.get('token')
    tokens = load_tokens()
    username = tokens.get(token)
    description = data.get('description', '')

    if not username:
        return jsonify({'status': 'INVALID'}), 401
    
    # Save user profile to file
    profiles_dir = os.path.join(os.path.dirname(__file__), 'profiles')
    os.makedirs(profiles_dir, exist_ok=True)
    profile_path = os.path.join(profiles_dir, f'{username}.json')
    
    profile = {
        'description': description
    }
    
    with open(profile_path, 'w', encoding='utf-8') as f:
        json.dump(profile, f)
    
    return jsonify({'status': 'OK'})

@app.route('/edit_server', methods=['POST'])
def edit_server():
    data = request.json
    token = data.get('token')
    tokens = load_tokens()
    username = tokens.get(token)

    if not username:
        return jsonify({'status': 'INVALID'}), 401

    server_id = data.get('server_id')
    name = data.get('name')

    if not server_id or not name:
        return jsonify({'status': 'INVALID'}), 400

    servers = load_servers()

    # Check if server exists and user has permission (owner or admin)
    if server_id in servers:
        server = servers[server_id]
        if server.get('owner') == username:
            # Update server name
            server['name'] = name
            save_servers(servers)
            return jsonify({'status': 'OK'})
        else:
            return jsonify({'status': 'FORBIDDEN'}), 403

    return jsonify({'status': 'NOT_FOUND'}), 404

@app.route('/leave_server', methods=['POST'])
def leave_server():
    data = request.json
    token = data.get('token')
    tokens = load_tokens()
    username = tokens.get(token)

    if not username:
        return jsonify({'status': 'INVALID'}), 401

    server_id = data.get('server_id')

    if not server_id:
        return jsonify({'status': 'INVALID'}), 400

    servers = load_servers()

    # Check if server exists
    if server_id in servers:
        server = servers[server_id]

        # Can't leave if you're the owner
        if server.get('owner') == username:
            return jsonify({'status': 'OWNER_CANNOT_LEAVE'}), 403

        # Remove user from server
        if username in server.get('users', []):
            server['users'].remove(username)
            save_servers(servers)
            return jsonify({'status': 'OK'})
        else:
            return jsonify({'status': 'NOT_MEMBER'}), 400

    return jsonify({'status': 'NOT_FOUND'}), 404

@app.route('/create_invite', methods=['POST'])
def create_invite():
    data = request.json
    token = data.get('token')
    tokens = load_tokens()
    username = tokens.get(token)

    if not username:
        return jsonify({'status': 'INVALID'}), 401

    server_id = data.get('server_id')
    expires_in = data.get('expires_in', 24 * 60 * 60)  # Default 24h in seconds

    servers = load_servers()
    if server_id not in servers:
        return jsonify({'status': 'NOT_FOUND'}), 404

    # Check permissions (server owner or admin can create invites)
    server = servers[server_id]
    if server.get('owner') != username:
        return jsonify({'status': 'FORBIDDEN'}), 403

    # Generate unique invite code
    import string
    import random
    import time

    def generate_code(length=8):
        chars = string.ascii_uppercase + string.ascii_lowercase + string.digits
        return ''.join(random.choice(chars) for _ in range(length))

    # Make sure code is unique
    invites = load_invites()
    code = generate_code()
    while code in invites:
        code = generate_code()

    # Store invite with expiration
    current_time = int(time.time())
    expires_at = current_time + expires_in

    invites[code] = {
        'server_id': server_id,
        'created_by': username,
        'created_at': current_time,
        'expires_at': expires_at
    }

    save_invites(invites)

    return jsonify({
        'status': 'OK',
        'invite_code': code,
        'expires_at': expires_at
    })

@app.route('/join_server', methods=['POST'])
def join_server():
    data = request.json
    token = data.get('token')
    tokens = load_tokens()
    username = tokens.get(token)

    if not username:
        return jsonify({'status': 'INVALID'}), 401

    invite_code = data.get('invite_code')
    if not invite_code:
        return jsonify({'status': 'INVALID'}), 400

    # Check if invite exists and is valid
    invites = load_invites()
    if invite_code not in invites:
        return jsonify({'status': 'INVALID_INVITE'}), 400

    invite = invites[invite_code]
    server_id = invite['server_id']

    # Check if invite has expired
    current_time = int(time.time())
    if current_time > invite.get('expires_at', 0):
        # Remove expired invite
        del invites[invite_code]
        save_invites(invites)
        return jsonify({'status': 'EXPIRED_INVITE'}), 400

    # Add user to server
    servers = load_servers()
    if server_id not in servers:
        return jsonify({'status': 'SERVER_NOT_FOUND'}), 404

    server = servers[server_id]
    if username in server.get('users', []):
        return jsonify({'status': 'ALREADY_MEMBER'}), 400

    # Add user to server members
    if 'users' not in server:
        server['users'] = []
    server['users'].append(username)

    save_servers(servers)

    return jsonify({
        'status': 'OK',
        'server_id': server_id,
        'server_name': server.get('name', 'Unknown Server')
    })

@app.route('/delete_server', methods=['POST'])
def delete_server():
    data = request.json
    token = data.get('token')
    tokens = load_tokens()
    username = tokens.get(token)

    if not username:
        return jsonify({'status': 'INVALID'}), 401

    server_id = data.get('server_id')
    if not server_id:
        return jsonify({'status': 'INVALID'}), 400

    servers = load_servers()
    # Check if server exists and user is owner
    if server_id not in servers:
        return jsonify({'status': 'NOT_FOUND'}), 404

    server = servers[server_id]
    if server.get('owner') != username:
        return jsonify({'status': 'FORBIDDEN'}), 403

    # Delete server
    del servers[server_id]
    save_servers(servers)

    # Delete related invites
    invites = load_invites()
    to_delete = []
    for code, invite in invites.items():
        if invite.get('server_id') == server_id:
            to_delete.append(code)

    for code in to_delete:
        del invites[code]
    save_invites(invites)

    return jsonify({'status': 'OK'})

@app.route('/update_server_settings', methods=['POST'])
def update_server_settings():
    data = request.json
    token = data.get('token')
    tokens = load_tokens()
    username = tokens.get(token)

    if not username:
        return jsonify({'status': 'INVALID'}), 401

    server_id = data.get('server_id')
    if not server_id:
        return jsonify({'status': 'INVALID'}), 400

    servers = load_servers()
    # Check if server exists and user is owner
    if server_id not in servers:
        return jsonify({'status': 'NOT_FOUND'}), 404

    server = servers[server_id]
    if server.get('owner') != username:
        return jsonify({'status': 'FORBIDDEN'}), 403

    # Update server settings
    settings = data.get('settings', {})

    # Update name if provided
    if 'name' in settings:
        server['name'] = settings['name']

    # Update icon if provided
    if 'icon' in settings:
        server['icon'] = settings['icon']

    # Update description if provided
    if 'description' in settings:
        server['description'] = settings['description']

    # Add other settings as needed

    save_servers(servers)

    return jsonify({'status': 'OK'})

@app.route('/edit_channel', methods=['POST'])
def edit_channel():
    data = request.json
    token = data.get('token')
    tokens = load_tokens()
    username = tokens.get(token)

    if not username:
        return jsonify({'status': 'INVALID'}), 401

    server_id = data.get('server_id')
    channel_id = data.get('channel_id')

    if not server_id or not channel_id:
        return jsonify({'status': 'INVALID'}), 400

    servers = load_servers()
    # Check if server and channel exist
    if server_id not in servers:
        return jsonify({'status': 'NOT_FOUND'}), 404

    server = servers[server_id]
    if server.get('owner') != username:
        return jsonify({'status': 'FORBIDDEN'}), 403

    if channel_id not in server.get('channels', {}):
        return jsonify({'status': 'CHANNEL_NOT_FOUND'}), 404

    channel = server['channels'][channel_id]

    # Update channel settings
    if 'name' in data:
        channel['name'] = data['name']

    if 'description' in data:
        channel['description'] = data['description']

    save_servers(servers)

    return jsonify({'status': 'OK'})

@app.route('/send_friend_request', methods=['POST'])
def send_friend_request():
    data = request.json
    token = data.get('token')
    tokens = load_tokens()
    username = tokens.get(token)

    if not username:
        return jsonify({'status': 'INVALID'}), 401

    target_username = data.get('username')
    if not target_username:
        return jsonify({'status': 'INVALID'}), 400

    # Check if target user exists
    users = load_users()
    if target_username not in users:
        return jsonify({'status': 'USER_NOT_FOUND'}), 404

    # Check if trying to add self
    if username == target_username:
        return jsonify({'status': 'CANNOT_ADD_SELF'}), 400

    # Load friends data
    friends_data = load_friends()

    # Check if already friends
    if username in friends_data.get('friends', {}) and target_username in friends_data['friends'].get(username, []):
        return jsonify({'status': 'ALREADY_FRIENDS'}), 400

    # Check if request already pending
    if target_username in friends_data.get('requests', {}) and username in friends_data['requests'].get(target_username, []):
        return jsonify({'status': 'REQUEST_ALREADY_SENT'}), 400

    # Initialize structures if needed
    if 'requests' not in friends_data:
        friends_data['requests'] = {}

    if target_username not in friends_data['requests']:
        friends_data['requests'][target_username] = []

    # Add request
    if username not in friends_data['requests'][target_username]:
        friends_data['requests'][target_username].append(username)

    save_friends(friends_data)

    return jsonify({'status': 'OK'})

@app.route('/accept_friend_request', methods=['POST'])
def accept_friend_request():
    data = request.json
    token = data.get('token')
    tokens = load_tokens()
    username = tokens.get(token)

    if not username:
        return jsonify({'status': 'INVALID'}), 401

    requester = data.get('username')
    if not requester:
        return jsonify({'status': 'INVALID'}), 400

    # Load friends data
    friends_data = load_friends()

    # Check if request exists
    if username not in friends_data.get('requests', {}) or requester not in friends_data['requests'].get(username, []):
        return jsonify({'status': 'REQUEST_NOT_FOUND'}), 404

    # Remove from pending requests
    friends_data['requests'][username].remove(requester)

    # Initialize friend lists if needed
    if 'friends' not in friends_data:
        friends_data['friends'] = {}

    if username not in friends_data['friends']:
        friends_data['friends'][username] = []

    if requester not in friends_data['friends']:
        friends_data['friends'][requester] = []

    # Add to each other's friend list
    if requester not in friends_data['friends'][username]:
        friends_data['friends'][username].append(requester)

    if username not in friends_data['friends'][requester]:
        friends_data['friends'][requester].append(username)

    save_friends(friends_data)

    return jsonify({'status': 'OK'})

@app.route('/reject_friend_request', methods=['POST'])
def reject_friend_request():
    data = request.json
    token = data.get('token')
    tokens = load_tokens()
    username = tokens.get(token)

    if not username:
        return jsonify({'status': 'INVALID'}), 401

    requester = data.get('username')
    if not requester:
        return jsonify({'status': 'INVALID'}), 400

    # Load friends data
    friends_data = load_friends()

    # Check if request exists
    if username not in friends_data.get('requests', {}) or requester not in friends_data['requests'].get(username, []):
        return jsonify({'status': 'REQUEST_NOT_FOUND'}), 404

    # Remove from pending requests
    friends_data['requests'][username].remove(requester)
    save_friends(friends_data)

    return jsonify({'status': 'OK'})

@app.route('/get_friend_requests', methods=['GET'])
def get_friend_requests():
    token = request.args.get('token')
    tokens = load_tokens()
    username = tokens.get(token)

    if not username:
        return jsonify({'status': 'INVALID'}), 401

    friends_data = load_friends()

    # Get pending requests for this user
    requests = friends_data.get('requests', {}).get(username, [])

    return jsonify({
        'status': 'OK',
        'requests': requests
    })

@app.route('/get_friends', methods=['GET'])
def get_friends():
    token = request.args.get('token')
    tokens = load_tokens()
    username = tokens.get(token)

    if not username:
        return jsonify({'status': 'INVALID'}), 401

    friends_data = load_friends()

    # Get friends list
    friends = friends_data.get('friends', {}).get(username, [])

    return jsonify({
        'status': 'OK',
        'friends': friends
    })

@app.route('/send_dm', methods=['POST'])
def send_dm():
    data = request.json
    token = data.get('token')
    tokens = load_tokens()
    username = tokens.get(token)

    if not username:
        return jsonify({'status': 'INVALID'}), 401

    target_username = data.get('username')
    content = data.get('content')

    if not target_username or not content:
        return jsonify({'status': 'INVALID'}), 400

    # Check if target user exists
    users = load_users()
    if target_username not in users:
        return jsonify({'status': 'USER_NOT_FOUND'}), 404

    # Check if they are friends
    friends_data = load_friends()
    if username not in friends_data.get('friends', {}) or target_username not in friends_data['friends'].get(username, []):
        return jsonify({'status': 'NOT_FRIENDS'}), 403

    # Load DMs data
    dms_data = load_dms()

    # Find or create DM channel between these users
    dm_id = None
    for did, dm_info in dms_data.get('direct', {}).items():
        users_set = set(dm_info.get('users', []))
        if users_set == {username, target_username}:
            dm_id = did
            break

    # Create new DM channel if doesn't exist
    if not dm_id:
        if 'direct' not in dms_data:
            dms_data['direct'] = {}

        # Generate new DM ID
        import time
        dm_id = f"dm_{int(time.time())}_{username}_{target_username}"

        dms_data['direct'][dm_id] = {
            'users': [username, target_username],
            'created_at': int(time.time()),
            'messages': {}
        }

    # Add message to DM channel
    messages = dms_data['direct'][dm_id].get('messages', {})
    if not messages:
        dms_data['direct'][dm_id]['messages'] = {}
        messages = dms_data['direct'][dm_id]['messages']

    # Generate message ID
    mid = str(max([int(k) for k in messages.keys()] + [0]) + 1)

    # Add timestamp to message
    import time
    timestamp = int(time.time() * 1000)  # Milliseconds since epoch

    # Store the message
    messages[mid] = {
        'author': username,
        'content': content,
        'timestamp': timestamp
    }

    save_dms(dms_data)

    return jsonify({
        'status': 'OK',
        'dm_id': dm_id,
        'message_id': mid
    })

@app.route('/get_dms', methods=['GET'])
def get_dms():
    token = request.args.get('token')
    tokens = load_tokens()
    username = tokens.get(token)

    if not username:
        return jsonify({'status': 'INVALID'}), 401

    dm_id = request.args.get('dm_id')
    since_timestamp = request.args.get('since', 0)

    try:
        since_timestamp = int(since_timestamp)
    except:
        since_timestamp = 0

    # Load DMs data
    dms_data = load_dms()

    # If specific DM channel requested
    if dm_id:
        # Check if this is a group chat (group IDs start with "group_")
        if dm_id.startswith('group_'):
            # Handle group chat messages
            if dm_id not in dms_data.get('groups', {}):
                return jsonify({'status': 'NOT_FOUND'}), 404

            group_info = dms_data['groups'][dm_id]
            if username not in group_info.get('users', []):
                return jsonify({'status': 'FORBIDDEN'}), 403

            messages = group_info.get('messages', {})

            # Filter messages by timestamp if needed
            if since_timestamp > 0:
                filtered_messages = {}
                for mid, msg in messages.items():
                    if msg.get('timestamp', 0) > since_timestamp:
                        filtered_messages[mid] = msg
                return jsonify({
                    'dm_id': dm_id,
                    'messages': filtered_messages
                })

            return jsonify({
                'dm_id': dm_id,
                'messages': messages
            })
        else:
            # Handle direct messages
            if dm_id not in dms_data.get('direct', {}):
                return jsonify({'status': 'NOT_FOUND'}), 404

            dm_info = dms_data['direct'][dm_id]
            if username not in dm_info.get('users', []):
                return jsonify({'status': 'FORBIDDEN'}), 403

            messages = dm_info.get('messages', {})

            # Filter messages by timestamp if needed
            if since_timestamp > 0:
                filtered_messages = {}
                for mid, msg in messages.items():
                    if msg.get('timestamp', 0) > since_timestamp:
                        filtered_messages[mid] = msg
                return jsonify({
                    'dm_id': dm_id,
                    'messages': filtered_messages
                })

            return jsonify({
                'dm_id': dm_id,
                'messages': messages
            })

    # Otherwise, return list of all DM channels for this user
    user_dms = []

    for did, dm_info in dms_data.get('direct', {}).items():
        if username in dm_info.get('users', []):
            # Find the other user
            other_users = [u for u in dm_info.get('users', []) if u != username]
            other_username = other_users[0] if other_users else "Unknown"

            # Get last message for preview
            messages = dm_info.get('messages', {})
            last_message = None
            if messages:
                last_mid = max(messages.keys(), key=int)
                last_message = messages[last_mid]

            user_dms.append({
                'dm_id': did,
                'other_user': other_username,
                'last_message': last_message,
                'unread': 0  # Could implement read receipts in the future
            })

    # Also include group chats
    for gid, group_info in dms_data.get('groups', {}).items():
        if username in group_info.get('users', []):
            # Get last message for preview
            messages = group_info.get('messages', {})
            last_message = None
            if messages:
                last_mid = max(messages.keys(), key=int)
                last_message = messages[last_mid]

            user_dms.append({
                'dm_id': gid,
                'name': group_info.get('name', 'Group Chat'),
                'is_group': True,
                'users': group_info.get('users', []),
                'last_message': last_message,
                'unread': 0  # Could implement read receipts in the future
            })

    return jsonify({
        'status': 'OK',
        'dms': user_dms
    })

@app.route('/create_group_chat', methods=['POST'])
def create_group_chat():
    data = request.json
    token = data.get('token')
    tokens = load_tokens()
    username = tokens.get(token)

    if not username:
        return jsonify({'status': 'INVALID'}), 401

    name = data.get('name', 'Group Chat')
    users = data.get('users', [])

    # Ensure creator is in the group
    if username not in users:
        users.append(username)

    # Verify all users exist and are friends with the creator
    all_users = load_users()
    friends_data = load_friends()

    invalid_users = []
    for user in users:
        if user != username:  # Skip self-check
            if user not in all_users:
                invalid_users.append(f"{user} (not found)")
            elif username not in friends_data.get('friends', {}) or user not in friends_data['friends'].get(username, []):
                invalid_users.append(f"{user} (not a friend)")

    if invalid_users:
        return jsonify({
            'status': 'INVALID_USERS',
            'invalid_users': invalid_users
        }), 400

    # Load DMs data
    dms_data = load_dms()

    # Initialize groups if needed
    if 'groups' not in dms_data:
        dms_data['groups'] = {}

    # Generate group ID
    import time
    group_id = f"group_{int(time.time())}_{username}"

    # Create group chat
    dms_data['groups'][group_id] = {
        'name': name,
        'owner': username,
        'users': users,
        'created_at': int(time.time()),
        'messages': {}
    }

    save_dms(dms_data)

    return jsonify({
        'status': 'OK',
        'group_id': group_id
    })

@app.route('/add_to_group_chat', methods=['POST'])
def add_to_group_chat():
    data = request.json
    token = data.get('token')
    tokens = load_tokens()
    username = tokens.get(token)

    if not username:
        return jsonify({'status': 'INVALID'}), 401

    group_id = data.get('group_id')
    user_to_add = data.get('username')

    if not group_id or not user_to_add:
        return jsonify({'status': 'INVALID'}), 400

    # Check if user exists
    users = load_users()
    if user_to_add not in users:
        return jsonify({'status': 'USER_NOT_FOUND'}), 404

    # Load DMs data
    dms_data = load_dms()

    # Check if group exists
    if group_id not in dms_data.get('groups', {}):
        return jsonify({'status': 'GROUP_NOT_FOUND'}), 404

    group = dms_data['groups'][group_id]

    # Check if user has permission (owner or admin)
    if group.get('owner') != username:
        return jsonify({'status': 'FORBIDDEN'}), 403

    # Check if user is already in group
    if user_to_add in group.get('users', []):
        return jsonify({'status': 'ALREADY_MEMBER'}), 400

    # Add user to group
    group['users'].append(user_to_add)

    # Add system message
    import time
    messages = group.get('messages', {})
    if not messages:
        group['messages'] = {}
        messages = group['messages']

    mid = str(max([int(k) for k in messages.keys()] + [0]) + 1)
    timestamp = int(time.time() * 1000)

    messages[mid] = {
        'author': 'system',
        'content': f"{user_to_add} was added to the group by {username}",
        'timestamp': timestamp,
        'is_system': True
    }

    save_dms(dms_data)

    return jsonify({'status': 'OK'})

@app.route('/leave_group_chat', methods=['POST'])
def leave_group_chat():
    data = request.json
    token = data.get('token')
    tokens = load_tokens()
    username = tokens.get(token)

    if not username:
        return jsonify({'status': 'INVALID'}), 401

    group_id = data.get('group_id')

    if not group_id:
        return jsonify({'status': 'INVALID'}), 400

    # Load DMs data
    dms_data = load_dms()

    # Check if group exists
    if group_id not in dms_data.get('groups', {}):
        return jsonify({'status': 'GROUP_NOT_FOUND'}), 404

    group = dms_data['groups'][group_id]

    # Check if user is in group
    if username not in group.get('users', []):
        return jsonify({'status': 'NOT_MEMBER'}), 400

    # If user is owner, transfer ownership or delete group
    if group.get('owner') == username:
        if len(group.get('users', [])) <= 1:
            # Last user leaving, delete group
            del dms_data['groups'][group_id]
            save_dms(dms_data)
            return jsonify({'status': 'OK', 'group_deleted': True})
        else:
            # Transfer ownership to another user
            other_users = [u for u in group.get('users', []) if u != username]
            group['owner'] = other_users[0]
            group['users'].remove(username)
    else:
        # Just remove user from group
        group['users'].remove(username)

    # Add system message
    import time
    messages = group.get('messages', {})
    if not messages:
        group['messages'] = {}
        messages = group['messages']

    mid = str(max([int(k) for k in messages.keys()] + [0]) + 1)
    timestamp = int(time.time() * 1000)

    messages[mid] = {
        'author': 'system',
        'content': f"{username} left the group",
        'timestamp': timestamp,
        'is_system': True
    }

    save_dms(dms_data)

    return jsonify({'status': 'OK'})

@app.route('/server_members', methods=['GET'])
def get_server_members():
    token = request.args.get('token')
    tokens = load_tokens()
    username = tokens.get(token)

    if not username:
        return jsonify({'status': 'INVALID'}), 401

    server_id = request.args.get('server_id')
    if not server_id:
        return jsonify({'status': 'INVALID'}), 400

    servers = load_servers()
    if server_id not in servers:
        return jsonify({'status': 'NOT_FOUND'}), 404

    server = servers[server_id]
    members = []
    
    # Get current time to check timeout status
    current_time = int(time.time())

    for user in server.get('users', []):
        # Determine role
        if user == server.get('owner'):
            role = 'owner'
        elif user in server.get('admins', []):
            role = 'admin'
        else:
            role = 'member'
        
        # Check if user has a nickname
        nickname = server.get('nicknames', {}).get(user)
        
        # Check if user is timed out
        timeout_info = None
        if 'timeouts' in server and user in server['timeouts']:
            timeout = server['timeouts'][user]
            if timeout['expires_at'] > current_time:
                timeout_info = timeout
            else:
                # Timeout has expired, remove it
                del server['timeouts'][user]
                save_servers(servers)
        
        # Create member object
        member_data = {
            'username': user,
            'role': role
        }
        
        # Add nickname if exists
        if nickname:
            member_data['nickname'] = nickname
            
        # Add timeout data if exists
        if timeout_info:
            member_data['timeout'] = timeout_info

        members.append(member_data)

    return jsonify({
        'status': 'OK',
        'members': members
    })

@app.route('/timeout_user', methods=['POST'])
def timeout_user():
    data = request.json
    token = data.get('token')
    tokens = load_tokens()
    username = tokens.get(token)

    if not username:
        return jsonify({'status': 'INVALID'}), 401

    server_id = data.get('server_id')
    target_user = data.get('username')
    duration = data.get('duration', 300)  # Default timeout: 5 minutes (300 seconds)
    reason = data.get('reason', '')

    if not server_id or not target_user:
        return jsonify({'status': 'INVALID'}), 400

    servers = load_servers()
    if server_id not in servers:
        return jsonify({'status': 'NOT_FOUND'}), 404

    server = servers[server_id]
    
    # Check if user has manage_members permission (server owner or admin)
    has_permission = (server.get('owner') == username or
                    username in server.get('admins', []))

    if not has_permission:
        return jsonify({'status': 'FORBIDDEN'}), 403

    # Check if target user exists in server
    if target_user not in server.get('users', []):
        return jsonify({'status': 'USER_NOT_FOUND'}), 404

    # Cannot timeout the server owner
    if target_user == server.get('owner'):
        return jsonify({'status': 'CANNOT_TIMEOUT_OWNER'}), 403

    # Set timeout
    import time
    current_time = int(time.time())
    expiry_time = current_time + duration

    # Initialize timeouts if not exists
    if 'timeouts' not in server:
        server['timeouts'] = {}

    server['timeouts'][target_user] = {
        'expires_at': expiry_time,
        'reason': reason,
        'by': username
    }

    save_servers(servers)

    return jsonify({
        'status': 'OK',
        'user': target_user,
        'expires_at': expiry_time
    })

@app.route('/remove_timeout', methods=['POST'])
def remove_timeout():
    data = request.json
    token = data.get('token')
    tokens = load_tokens()
    username = tokens.get(token)

    if not username:
        return jsonify({'status': 'INVALID'}), 401

    server_id = data.get('server_id')
    target_user = data.get('username')

    if not server_id or not target_user:
        return jsonify({'status': 'INVALID'}), 400

    servers = load_servers()
    if server_id not in servers:
        return jsonify({'status': 'NOT_FOUND'}), 404

    server = servers[server_id]
    
    # Check if user has manage_members permission
    has_permission = (server.get('owner') == username or
                    username in server.get('admins', []))

    if not has_permission:
        return jsonify({'status': 'FORBIDDEN'}), 403

    # Check if target user exists in server
    if target_user not in server.get('users', []):
        return jsonify({'status': 'USER_NOT_FOUND'}), 404

    # Check if user is timed out
    if 'timeouts' not in server or target_user not in server['timeouts']:
        return jsonify({'status': 'NOT_TIMED_OUT'}), 400

    # Remove timeout
    del server['timeouts'][target_user]
    save_servers(servers)

    return jsonify({
        'status': 'OK',
        'user': target_user
    })

@app.route('/set_nickname', methods=['POST'])
def set_nickname():
    data = request.json
    token = data.get('token')
    tokens = load_tokens()
    username = tokens.get(token)

    if not username:
        return jsonify({'status': 'INVALID'}), 401

    server_id = data.get('server_id')
    target_user = data.get('username')
    nickname = data.get('nickname', '')

    if not server_id or not target_user:
        return jsonify({'status': 'INVALID'}), 400

    servers = load_servers()
    if server_id not in servers:
        return jsonify({'status': 'NOT_FOUND'}), 404

    server = servers[server_id]
    
    # User can change their own nickname, or users with manage_members permission can change anyone's
    is_self = (username == target_user)
    has_permission = (server.get('owner') == username or
                     username in server.get('admins', []))

    if not is_self and not has_permission:
        return jsonify({'status': 'FORBIDDEN'}), 403

    # Check if target user exists in server
    if target_user not in server.get('users', []):
        return jsonify({'status': 'USER_NOT_FOUND'}), 404

    # Initialize nicknames if not exists
    if 'nicknames' not in server:
        server['nicknames'] = {}

    # If nickname is empty, remove it (reset to default)
    if not nickname.strip():
        if target_user in server['nicknames']:
            del server['nicknames'][target_user]
    else:
        # Set nickname (limit to 32 characters)
        server['nicknames'][target_user] = nickname[:32]

    save_servers(servers)

    return jsonify({
        'status': 'OK',
        'user': target_user,
        'nickname': nickname[:32] if nickname.strip() else None
    })

# Migration: convert .bin files to .json if needed
if os.path.exists(os.path.join(os.path.dirname(__file__), 'accounts.bin')) and not os.path.exists(USERS_PATH):
    with open(os.path.join(os.path.dirname(__file__), 'accounts.bin'), 'rb') as f:
        users = pickle.load(f)
    with open(USERS_PATH, 'w', encoding='utf-8') as f:
        json.dump(users, f)
    print('Migrated accounts.bin to accounts.json')

if os.path.exists(os.path.join(os.path.dirname(__file__), 'servers.bin')) and not os.path.exists(SERVERS_PATH):
    with open(os.path.join(os.path.dirname(__file__), 'servers.bin'), 'rb') as f:
        servers = pickle.load(f)
    with open(SERVERS_PATH, 'w', encoding='utf-8') as f:
        json.dump(servers, f)
    print('Migrated servers.bin to servers.json')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)




