from human_readable import date_time
from colorsys import hls_to_rgb
from networkLib import Packet
import engine as ui
import serverlib
import time as t
import os

def hsl(h,s,l):
    r,g,b = hls_to_rgb(h/360,l/100,s/100)
    return (r*255,g*255,b*255)

### CONNECT ###

client = serverlib.connect('127.0.0.1', 5000)

serverlib.login()

# Util methods
def pullData():
    global servers, server_icons
    servers = serverlib.get('servers')

    if not isinstance(servers, dict):
        t.sleep(0.5)
        return pullData()

    server_icons = {}

    os.makedirs('files',exist_ok=True)

    for id, server in servers.items():
        server['id'] = id

        server_icons[server['name']] = f'files/{server["icon"].split("/")[-1]}'
        if os.path.exists(f'files/{server["icon"]}'): continue

        print(f'Downloading: {server["icon"]}')

        data = serverlib.get(f'file {server['icon']}')
        if data in {'NOT_FOUND', 'FORBIDDEN'}:
            continue

        with open(f'files/{server["icon"].split("/")[-1]}', 'wb') as f:
            f.write(data)

def create_server(name):
    client.send(Packet('CREATE',f'server {name}'))
    pullData()
    update_ui()

def create_server_popup():  # sourcery skip: inline-immediately-returned-variable
    global popups
    p = Popup(
        (root.width//2-200,root.height//2-100),
        (400,200),
        'Create server',
        'Enter server name',
        {
            'name': {
                'type': 'input',
                'name': 'Server name',
                'size': 20
            },
            'ok': {
                'type': 'button',
                'text': 'OK',
                'action': lambda: (create_server(p.components['name']['manager'].value), p.close())
            },
            'cancel': {
                'type': 'button',
                'text': 'Cancel',
                'action': lambda: p.close()
            }
        }
    ).add(root,10)
    popups.append(p)
    return p

def init_selected():
    global selected_channels
    selected_channels = {id:list(server['channels'].values())[0] for id,server in servers.items() if server.get('channels')}

def get_messages(serverId,channelId,start,amount):
    messages = serverlib.get(f'messages {serverId} {channelId} {start} {start+amount}')
    if not isinstance(messages, list):
        t.sleep(0.5)
        return get_messages(serverId,channelId,start,amount)
    return messages

def get_channel(serverId,channelId):
    return servers[serverId]['channels'][channelId]

def refresh_ui():
    global selectedId, selectedChannelId, selectedMessages
    ### Get messages ###
    selectedId = selected_server.get('id')
    selectedChannelId = selected_channels.get(selectedId,{}).get('id')
    selectedMessages = get_messages(selectedId,selectedChannelId,0,50)

    update_ui()

pullData()


### COLORS ###

def init_colors(hue):
    global HUE, COLOR_PRIMARY, COLOR_SECONDARY, COLOR_TERTIARY, TEXT, TEXT_HIGHLIGHT

    HUE = hue*360

    COLOR_PRIMARY   = hsl(HUE, 50, 10)
    COLOR_SECONDARY = hsl(HUE, 50, 15)
    COLOR_TERTIARY  = hsl(HUE, 50, 20)

    TEXT = hsl(HUE, 0.50, 0.90)
    TEXT_HIGHLIGHT = hsl(HUE, 0.80, 0.80)

    try:
        update_ui()
        root.bg_color = COLOR_PRIMARY
    except: ...

init_colors(230)

### UI ###

class Popup(ui.Component):
    def __init__(
            self,
            position:tuple[int,int],
            size:tuple[int,int],
            title:str,
            message:str,
            components:dict,
        ):
        self.children = []
        self.parent = None

        # Position
        self.pos = position
        self.x = position[0]
        self.y = position[1]
        self.abs_pos = self.pos
        self.abs_x = self.x
        self.abs_y = self.y

        # Style
        self.title = title
        self.message = message
        self.components = components
        self.width, self.height = size

        # Rendering
        self.layer = 0
        self.visible = True

        self.events = []
        self.eventCallbacks = []
        self.blitCallbacks = []

        buttons = 0

        for i, (name, component) in enumerate(self.components.items()):
            if component['type'] == 'input':

                component['manager'] = ui.TextInputManager()
                component['visualizer'] = ui.TextInputVisualizer(
                    component['manager'],
                    ui.getFont(component.get('size',20)),
                    True,
                    font_color=component.get('font_color', (255,255,255))
                )

                manager:ui.TextInputManager = component['manager']
                visualizer:ui.TextInputVisualizer = component['visualizer']

                self.eventCallbacks.append(visualizer.update)
                self.blitCallbacks.append(lambda: (visualizer.surface, (self.abs_x+padx*3, self.abs_y+pady+60)))

            elif component['type'] == 'button':
                buttons += 1
                ui.Button(
                    (self.width-(70+padx)*buttons, self.height-30-pady),
                    70,
                    30,
                    component['text'],
                    20,
                    color = (40,40,40),
                    hover_color=(35,35,35),
                    font_color=(255,255,255),
                    corner_radius=5,
                    action=component['action']
                ).add(self,100)

    def addChild(self, child):
        child.setPos(child.x,child.y)
        self.children.append(child)
        self.children = sorted(self.children,key=lambda x: x.layer)

    def event(self, event):
        self.events.append(event)

        event.handled = False
        for child in reversed(self.children):
            if hasattr(child,'event') and child.visible:
                child.event(event)

    def remove(self, object):
        try: self.children.remove(object)
        except: ...

    def tick(self, frame):
        for child in self.children:
            if hasattr(child,'tick'):
                child.tick(frame)

    def close(self):
        self.children = []
        self.blitCallbacks  = []
        self.eventCallbacks = []
        self.components = []

        popups.remove(self)
        self.parent.remove(self)
        del self

    def render(self):
        if not self.changed: return

        self.changed = False


        ui.pygame.draw.rect(
            ui.root.disp,
            (50,50,50),
            (self.abs_x,self.abs_y,self.width,self.height),
            border_radius=self.width//50
        )

        ui.drawTextMultiline(
            self.title,
            self.abs_x+padx*2,
            self.abs_y+pady*2,
            (255,255,255),
            ui.getFont(30),
            self.width-padx*4,
            (50,50,50)
        )

        for i, (name, component) in enumerate(self.components.items()):
            if component['type'] == 'input':
                ui.focus = None

                ui.pygame.draw.rect(
                    root.disp,
                    (40,40,40),
                    (self.abs_x+padx*2, self.abs_y+pady+55, self.width-padx*4, component['size']+5),
                    border_radius=self.width//100
                )

                ui.drawTextMultiline(
                    component['name'],
                    self.abs_x+padx*2,
                    self.abs_y+30+padx*2,
                    (255,255,255),
                    ui.getFont(25),
                    self.width-padx*4,
                    (50,50,50)
                )

        for callback in self.eventCallbacks:
            callback(self.events)

        for blit in self.blitCallbacks:
            root.disp.blit(*blit())

        for child in self.children:
            child.render()

        self.events = []


padx = 5
pady = 5

toppady = 10

root = ui.Root("Chat-V7", bg=COLOR_PRIMARY, res=(700, 600), show_fps=True)

selected_server = list(servers.values())[0] if servers else None

message_bar_content = ''
popups = []

def update_ui():
    global server_list, server_list_area, selectedId, selectedChannelId, selectedMessages
    global message_bar
    root.children = popups.copy()

    if selectedChannelId:
        try: servers[selectedId]['channels'][selectedChannelId]['messages'] = selectedMessages
        except: refresh_ui()

    ### Server list ###
    server_list = ui.Frame(
        (pady,padx),
        50,
        root.height-pady
    ).add(root)

    server_list_area = ui.Area(
        (0,0),
        server_list.width+padx*2,
        server_list.height,
        COLOR_SECONDARY
    ).add(server_list)

    ### SERVER LIST ###
    for lines, server in enumerate(servers.values()):
        def callback(thing=None):
            def func():
                global selected_server
                selected_server = thing
                pullData()
                ui.Thread(target=refresh_ui).start()
            return func

        ui.Button(
            (padx, lines*55+toppady),
            50,
            50,
            "",
            0,
            callback(thing=server)
        ).add(server_list)

        ui.Image(
            (padx, lines*55+toppady),
            server_icons[server['name']],
            50,
            50
        ).add(server_list)

    ### CREATE SERVER ###
    ui.Button(
        (padx,server_list.height-50-pady),
        50,
        50,
        "+",
        45,
        lambda: create_server_popup()
    ).add(server_list)

    ### CHANNEL LIST ###
    if selected_server:
        channel_list = ui.Frame(
            (server_list.width+padx*4,pady),
            150,
            root.height-pady
        ).add(root)

        channel_list_area = ui.Area(
            (0,0),
            channel_list.width,
            channel_list.height,
            COLOR_SECONDARY,
            corner_radius=7
        ).add(channel_list)

        for lines, channel in enumerate(servers[selectedId]['channels'].values()):
            def callback(thing=None):
                def func():
                    global selected_channels
                    selected_channels[selectedId] = thing
                    ui.Thread(target=refresh_ui).start()
                return func

            ui.Button(
                (padx, lines*(30+pady)+pady),
                channel_list.width-padx*2,
                30,
                channel['name'],
                20,
                callback(thing=channel),
                corner_radius=7,
                color=COLOR_TERTIARY
            ).add(channel_list)

    ### MEMBER LIST ###
    if selected_server:
        member_list = ui.Frame(
            (root.width-150-padx,pady),
            150,
            root.height-pady*2
        ).add(root)

        member_list_area = ui.Area(
            (0,0),
            channel_list.width,
            channel_list.height-pady,
            COLOR_SECONDARY,
            corner_radius=7
        ).add(member_list)

        for lines, member in enumerate(selected_server['users']):
            def callback(thing=None):
                def func():
                    print(thing)
                return func

            ui.Button(
                (padx, lines*(30+pady)+pady),
                member_list.width-padx*2,
                30,
                member,
                20,
                callback(thing=member),
                corner_radius=7,
                color=COLOR_TERTIARY
            ).add(member_list)

    ### CHAT ###
    if selected_channels.get(selectedId) and selectedMessages != 'NOT_FOUND':
        def callback(content:str):
            global message_bar_content

            if content.count('\\n') >= 13:
                return

            if '\n' in content:
                if ui.pygame.key.get_mods() & ui.pygame.KMOD_SHIFT:
                    content = content.replace('\n','\\n')
                    message_bar_content = content
                    message_bar.content = content
                    return

                content = content.strip()
                serverlib.send(selectedId,selectedChannelId,content)

                message_bar_content = ''

                refresh_ui()

                return

            if len(content) >= 100:
                message_bar.content = message_bar_content
                return

            message_bar_content = content

        chat = ui.Frame(
            (channel_list.x+channel_list.width,pady),
            root.width-server_list.width-channel_list.width-member_list.width-padx*5,
            root.height-pady
        ).add(root)

        lines = ui.drawTextMultiline(message_bar_content,10000,10000,(255,255,255),ui.getFont(30),chat.width-padx*2-6)

        if lines == 0: lines = 1

        message_bar = ui.Textbox(
            (padx,chat.height-30-lines*30-pady),
            chat.width-padx*2,
            30+lines*30,
            30,
            corner_radius=10,
            color=COLOR_SECONDARY,
            hover_color=COLOR_SECONDARY,
            focus_color=COLOR_TERTIARY,
            multiline=True,
            action=callback,
            text = message_bar_content
        ).add(chat)

        ui.focus = message_bar

        # Messages
        lines = 0
        messages = 0
        for message in reversed(selectedMessages):
            messages += 1
            lines += ui.drawTextMultiline(message['content'],10000,10000,(255,255,255),ui.getFont(30),chat.width-padx*2)

            message_frame = ui.Frame(
                (padx,root.height - message_bar.height - lines * (25 + pady) - messages * (25 + pady) - pady * 2),
                chat.width-padx*4,
                50
            ).add(chat)

            ui.Text(
                (30+padx,0),
                f'{message["author"]} - {date_time(message['timestamp']-t.time())}',
                bg_color=root.bg_color,
                font=ui.getFont(25),
                color=(255,255,255),
                align='left',
                max_width=message_frame.width
            ).add(message_frame)

            ui.Area(
                (0,-pady),
                30,
                30,
                (40,40,40),
                corner_radius=7
            ).add(message_frame)

            ui.Text(
                (padx,30),
                message['content'],
                bg_color=root.bg_color,
                font=ui.getFont(30),
                color=(255,255,255),
                align='left',
                max_width=message_frame.width
            ).add(message_frame)

### START ###
init_selected()
refresh_ui()

# Support resizing the window
@root.addEventListener
def event(event):
    if event.type == ui.pygame.VIDEORESIZE: update_ui()

root.show(True)

ui.running = True
while ui.running:
    ui.update()
    if ui.frame % 1 == 0:
        init_colors((HUE+1)%360/360)
