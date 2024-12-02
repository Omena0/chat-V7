
# Protocol docs

## LOGIN

Type: `LOGIN`

Data: `{username}\n{md5(password)}`

### Response

Type: `status`

Data: `OK`, `INVALID`

## GET

Type: `GET`

Data: `<file|servers|user|messages>`

### Response 1 (err)

Type: `status`

Data: `NOT_FOUND`, `FORBIDDEN`

### Response 2 (success)

Type: `data`

Data: `{requested_data}`

## SEND

Type: `SEND`

Data: `<serverId> <channelId> <messageContent>`

### Response

Type: `status`

Data: `NOT_FOUND`, `FORBIDDEN`, `OK`
