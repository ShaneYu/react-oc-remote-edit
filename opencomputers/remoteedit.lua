local JSON = require("JSON")
local ws = require("websocket_client")
local filesystem = require("filesystem")
local computer = require("computer")
local shell = require("shell")
local event = require("event")

-----------------------------------------------------------------------------------------------------

local cl = nil
local settings = {
  wsUrl = "ws://shaneyu.com:9898/"
}

local function cancel()
  local computerAddr = computer.address()

  event.push("remoteedit:cancel", computerAddr)
end

local function clCallback(e, var)
  if e == "text" then
    local output, err = JSON:decode(var)

    if output.event == "remoteedit:complete" then
      event.push(output.event, output.computerAddress, output.fileContent)
    end

    return
  end

  if e == "close_request" then
    cancel()
    return
  end

  if e == "error" or e == "handshake_error" then
    io.stderr.write("remoteedit failure, "..var)
    cancel()
    return
  end

  print("Got WSC callback with: "..e.." -> "..var)
end

function start(fileName)
  print("Starting remote edit for file '"..fileName.."' on "..settings.wsUrl..".")

  local computerAddr = computer.address()

  cl:connectURL(settings.wsUrl)
  cl:update()

  local fileContent = ""
  local filePath = shell.resolve(fileName)

  if filesystem.exists(filePath) then
    local fileStream = io.open(filePath, "r")
    fileContent = fileStream:read("*a")
    fileStream:close()
  end

  local message = JSON:encode({
    event = "remoteedit:start",
    computerAddress = computerAddr,
    fileName = fileName,
    fileContent = fileContent
  })

  cl:send(message)

  print("remoteedit is waiting for completion...")

  while true do
    local ev = {event.pull()}

    if ev[1] == "interrupted" then
      cancel()
    end

    if ev[1] == "remoteedit:cancel" and ev[2] == computerAddr then
      cl:send(JSON:encode({ event = "remoteedit:cancel", computerAddress = computerAddr }))

      if cl:isConnected() then
        cl:disconnect()
      end

      print("remoteedit was cancelled")
      break
    end
  
    if ev[1] == "remoteedit:complete" and ev[2] == computerAddr then
      local filePath = shell.resolve(fileName)
      local fileStream = io.open(fileName, "w")

      fileStream:write(ev[3])
      fileStream:close()

      print("remoteedit complete, file updated")
      break
    end
  end
end

cl = ws.create(clCallback)

-----------------------------------------------------------------------------------------------------

local params = {...}
start(params[1])
