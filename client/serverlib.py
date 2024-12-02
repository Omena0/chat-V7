from networkLib import Client, Packet
import tkinter.messagebox
import engine as ui
import webbrowser
import time as t
import hashlib
import os

newsText = """
Welcome to Chat-V7!
A private and
completely anonymous
chat application,
with end-to-end
encryption.
It's free, open source,
and easily expandable.

Please report bugs in
the github issues page!
Thanks!
"""

class ProtocolError(Exception): ...
class LoginError(Exception): ...


### LOGIN ###

HOME = os.path.join(os.environ.get('USERPROFILE'), '.chat-v7')

os.makedirs(HOME, exist_ok=True)

def connect(ip,port):
    global client
    client = Client(ip, port)
    client.connect()
    return client

def _login_button():
    username = username_field.text
    password = hashlib.md5(password_field.text.encode()).hexdigest()
    _login(username, password)

def _login(username,password):
    client.send(Packet('LOGIN', f'{username}\n{password}'))

    response = client.recv()

    print(response)

    if response.type != 'status':
        raise ProtocolError(f'Invalid login status response type: {response.type}')

    if response.data != 'OK':
        tkinter.messagebox.showerror("Invalid credentials", "Please check your credentials and try again")
        return False

    ui.running = False
    with open(os.path.join(HOME, 'loginData.bin'), 'w') as f:
        f.write(f'{username}\n{password}')

    return True

def _login_ui():
    global username_field, password_field, login_root
    login_root = ui.Root(
        "Log in to Chat-V7",
        (35,35,80),
        (460,370),
        show_fps=True
    ).show(False)

    # Title
    ui.Text(
        (login_root.width//2,20),
        "Log in to Chat-V7",
        70,
        color=(120,120,255),
        bg_color=login_root.bg_color
    ).add(login_root)

    # Username
    ui.Text(
        (115,login_root.height//4-10),
        "Username:",
        50,
        color = (100,100,200),
        bg_color=login_root.bg_color
    ).add(login_root)

    username_field = ui.Textbox(
        (15,login_root.height//4+30),
        200,
        40,
        40,
        color = (50,50,100),
        hover_color=(60,60,120),
        focus_color=(65,65,130)
    ).add(login_root)

    # Password
    ui.Text(
        (115,login_root.height//4+90),
        "Password:",
        50,
        color = (100,100,200),
        bg_color=login_root.bg_color
    ).add(login_root)

    password_field = ui.Textbox(
        (15,login_root.height//4+130),
        200,
        40,
        40,
        color = (50,50,100),
        hover_color=(60,60,120),
        focus_color=(65,65,130)
    ).add(login_root)

    # Login button
    ui.Button(
        (15,login_root.height//4+205),
        200,
        60,
        "Log in",
        50,
        color = (50,50,100),
        hover_color=(60,60,120),
        font_color=(130,130,255),
        action=_login_button
    ).add(login_root)

    # News
    ui.Text(
        (340,65),
        newsText,
        28,
        color = (80,80,160),
        bg_color=login_root.bg_color
    ).add(login_root)

    # Github button
    ui.Button(
        (login_root.width-215,login_root.height//4+205),
        200,
        60,
        "Github",
        50,
        color = (50,50,100),
        hover_color=(60,60,120),
        font_color=(130,130,255),
        action=lambda: webbrowser.open('https://github.com/Omena0/chat-V7')
    ).add(login_root)

    ui.mainloop()

def login(ui=True):
    if os.path.exists(os.path.join(HOME, 'loginData.bin')):
        try:
            with open(os.path.join(HOME, 'loginData.bin'), 'r') as f:
                username, password = f.read().split('\n')

            _login(username, password)
        except:
            if ui:
                _login_ui()

    elif ui:
        _login_ui()
    else:
        raise LoginError('Could not log in.')

def get(data):
    client.send(Packet('GET', data))

    packet = client.recv()

    if not packet: return

    if packet.type in {'response', 'data', 'status'}:
        return packet.data
    else:
        raise ProtocolError(f'Invalid GET response type: {packet.type}')

def send(server,channel,content):
    if not content: return
    client.send(Packet('SEND', f'{server} {channel} {content}'))

    response = client.recv()

    if not response:
        print('Timed out')
        return

    if response.type != 'status':
        raise ProtocolError(f'Invalid SEND response type: {response.type}')

    if response.data == 'OK':
        return True
    elif response.data == 'INVALID_REQUEST':
        raise ProtocolError('Invalid request.')
    else:
        return False
