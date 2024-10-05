import serverlib
import engine as ui
import os

serverlib.connect()
serverlib.login()

def pullData():
    global servers, server_icons
    servers = serverlib.get('servers', type='object')
    server_icons = {}

    print(servers)

    os.makedirs('files',exist_ok=True)
    for s in servers:
        server_icons[s['name']] = f'files/{s["icon"]}'
        if os.path.exists(f'files/{s["icon"]}'): continue
        print(f'Downloading: {s["icon"]}')
        with open(f'files/{s["icon"]}', 'wb') as f:
            f.write(serverlib.get(s['icon'], type='file'))

pullData()

### UI ###

padx = 5
pady = 5

toppady = 10

root = ui.Root("Chat-V7", bg=(49, 51, 56), res=(700, 600), show_fps=False)

def update_ui():
    global server_list, server_list_area
    root.children = []
    print('a')

    server_list = ui.Frame(
        (pady,padx),
        50,
        root.height-pady
    ).add(root)

    server_list_area = ui.Area(
        (0,0),
        server_list.width+padx*2,
        server_list.height,
        (100,100,100)
    ).add(server_list)

    # Create server list
    for i, server in enumerate(servers):
        def callback(thing=None):
            def func():
                print(thing)
            return func

        ui.Button(
            (padx, i*55+toppady),
            50,
            50,
            "",
            0,
            callback(thing=server)
        ).add(server_list)

        ui.Image(
            (padx, i*55+toppady),
            server_icons[server['name']],
            50,
            50
        ).add(server_list)

    def create_server():
        serverlib.send('')

    # Create server button
    ui.Button(
        (padx,server_list.height-50-pady),
        50,
        50,
        "+",
        45,
        create_server
    ).add(server_list)

update_ui()

@root.addEventListener
def event(event):
    if event.type == ui.pygame.VIDEORESIZE: update_ui()


root.show(True)
ui.mainloop()
