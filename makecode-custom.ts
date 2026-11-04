enum SmartDevice {
    //% block="照明"
    Light,
    //% block="扇風機"
    Fan,
    //% block="エアコン"
    Air,
    //% block="テレビ"
    TV,
    //% block="スマートロック"
    Lock,
    //% block="シャッター"
    Shutter,
    //% block="防犯カメラ"
    Camera,
    //% block="ロボット掃除機"
    Vacuum,
    //% block="お風呂"
    Bath,
    //% block="洗濯機"
    Washer,
    //% block="電子レンジ"
    Microwave
}

enum LightBrightness {
    //% block="弱"
    Low = 1,
    //% block="中"
    Medium = 2,
    //% block="強"
    High = 3
}

enum SmartNumber {
    //% block="1"
    N1 = 1,
    //% block="2"
    N2 = 2,
    //% block="3"
    N3 = 3,
    //% block="4"
    N4 = 4,
    //% block="5"
    N5 = 5,
    //% block="6"
    N6 = 6,
    //% block="7"
    N7 = 7,
    //% block="8"
    N8 = 8,
    //% block="9"
    N9 = 9,
    //% block="10"
    N10 = 10,
    //% block="11"
    N11 = 11,
    //% block="12"
    N12 = 12,
    //% block="13"
    N13 = 13,
    //% block="14"
    N14 = 14,
    //% block="15"
    N15 = 15,
    //% block="16"
    N16 = 16
}

enum SmartAirMode {
    //% block="冷房"
    Cool,
    //% block="暖房"
    Heat
}

enum SmartCameraDirection {
    //% block="正面"
    Forward = 0,
    //% block="右"
    Right = 90,
    //% block="後ろ"
    Back = 180,
    //% block="左"
    Left = 270
}

//% color=#28766b icon="\uf015" block="スマートハウス" groups=['機器を操作', '状態を調べる']
namespace smartHouse {
    let deviceStates = ""
    let currentHour = -1
    let batteryPercent = -1
    let homePower = -1

    function send(command: string): void {
        serial.writeString("\n" + command + "\n")
    }

    function kind(device: SmartDevice): string {
        return ["light", "fan", "ac", "tv", "lock", "shutter", "camera", "vacuum", "bath", "washer", "microwave"][device]
    }

    //% block="スマートハウス通信を開始" weight=100 group="機器を操作"
    export function start(): void {
        serial.redirectToUSB()
        serial.setBaudRate(BaudRate.BaudRate115200)
        serial.setWriteLinePadding(0)
        serial.setTxBufferSize(64)
        serial.setRxBufferSize(128)
        serial.onDataReceived(serial.delimiters(Delimiters.NewLine), function () {
            const line = serial.readUntil(serial.delimiters(Delimiters.NewLine))
            const payload = line.substr(1)
            const value = parseInt(payload)
            if (payload === "" + value) {
                if (line.charAt(0) === "H" && value >= 6 && value <= 23) currentHour = value
                if (line.charAt(0) === "P" && value >= 0) homePower = value
                if (line.charAt(0) === "B" && value >= 0 && value <= 100) batteryPercent = value
            }
            if (line.charAt(0) === "S" && payload.length === 44) {
                let valid = true
                for (let index = 0; index < payload.length; index++) {
                    if ("0123456789abcdef".indexOf(payload.charAt(index)) < 0) valid = false
                }
                if (valid) deviceStates = payload
            }
        })
    }

    function sendLight(number: number, brightness: number): void {
        const command = "L" + number + brightness
        for (let attempt = 0; attempt < 3; attempt++) {
            serial.writeString("\n" + command + "\n")
            basic.pause(60)
        }
    }

    //% block="照明 %number を %brightness でつける" number.min=1 number.defl=1 weight=95 blockHidden=true group="機器を操作"
    export function lightOn(number: number, brightness: LightBrightness): void {
        sendLight(number, brightness)
    }

    //% block="照明 %number を消す" number.min=1 number.defl=1 weight=94 blockHidden=true group="機器を操作"
    export function lightOff(number: number): void {
        sendLight(number, 0)
    }

    //% block="%device %number を切り替える" number.min=1 number.defl=1 weight=90 blockHidden=true group="機器を操作"
    export function toggle(device: SmartDevice, number: number): void {
        if (device === SmartDevice.Light) {
            serial.writeLine("A" + number)
        } else {
            serial.writeLine("T:" + kind(device) + ":" + number)
        }
    }

    //% block="%device %number の電源を %on にする" number.min=1 number.defl=1 blockHidden=true group="機器を操作"
    export function power(device: SmartDevice, number: number, on: boolean): void {
        serial.writeLine("P:" + kind(device) + ":" + number + ":" + (on ? "1" : "0"))
    }

    //% block="%device %number を段階 %level にする" number.min=1 number.defl=1 level.min=0 level.max=3 level.defl=1 blockHidden=true group="機器を操作"
    export function level(device: SmartDevice, number: number, level: number): void {
        serial.writeLine("L:" + kind(device) + ":" + number + ":" + level)
    }

    //% block="プランター %number に水をやる" number.min=1 number.defl=1 blockHidden=true group="機器を操作"
    export function water(number: number): void {
        serial.writeLine("W:" + number)
    }

    //% block="照明 %number を %brightness でつける" number.defl=SmartNumber.N1 weight=95 group="機器を操作"
    export function chooseLightOn(number: SmartNumber, brightness: LightBrightness): void {
        lightOn(number, brightness)
    }

    //% block="照明 %number を消す" number.defl=SmartNumber.N1 weight=94 group="機器を操作"
    export function chooseLightOff(number: SmartNumber): void {
        lightOff(number)
    }

    //% block="扇風機 %number を %speed で回す" group="機器を操作"
    export function fanOn(number: SmartNumber, speed: LightBrightness): void {
        send("L:fan:" + number + ":" + speed)
    }

    //% block="扇風機 %number を止める" group="機器を操作"
    export function fanOff(number: SmartNumber): void {
        send("L:fan:" + number + ":0")
    }

    //% block="エアコン %number を %mode で運転する" group="機器を操作"
    export function airOn(number: SmartNumber, mode: SmartAirMode): void {
        send("C:" + number + ":" + (mode === SmartAirMode.Heat ? "1" : "0"))
    }

    //% block="エアコン %number を止める" group="機器を操作"
    export function airOff(number: SmartNumber): void {
        power(SmartDevice.Air, number, false)
    }

    //% block="鍵 %number を施錠する" group="機器を操作"
    export function lockDoor(number: SmartNumber): void {
        power(SmartDevice.Lock, number, true)
    }

    //% block="鍵 %number を解錠する" group="機器を操作"
    export function unlockDoor(number: SmartNumber): void {
        power(SmartDevice.Lock, number, false)
    }

    //% block="シャッター %number を開ける" group="機器を操作"
    export function openShutter(number: SmartNumber): void {
        power(SmartDevice.Shutter, number, true)
    }

    //% block="シャッター %number を閉める" group="機器を操作"
    export function closeShutter(number: SmartNumber): void {
        power(SmartDevice.Shutter, number, false)
    }

    //% block="カメラ %number を %direction に向ける" group="機器を操作"
    export function aimCamera(number: SmartNumber, direction: SmartCameraDirection): void {
        send("D:camera:" + number + ":" + direction)
    }

    //% block="お風呂 %number の湯はりを始める" group="機器を操作"
    export function fillBath(number: SmartNumber): void {
        power(SmartDevice.Bath, number, true)
    }

    //% block="お風呂 %number の湯はりを止める" group="機器を操作"
    export function stopBath(number: SmartNumber): void {
        power(SmartDevice.Bath, number, false)
    }

    //% block="%device %number を運転する" group="機器を操作"
    export function turnOn(device: SmartDevice, number: SmartNumber): void {
        power(device, number, true)
    }

    //% block="%device %number を停止する" group="機器を操作"
    export function turnOff(device: SmartDevice, number: SmartNumber): void {
        power(device, number, false)
    }

    //% block="プランター %number に水やりする" group="機器を操作"
    export function waterPlanter(number: SmartNumber): void {
        water(number)
    }

    //% block="現在の時刻（時）" group="状態を調べる"
    export function hour(): number {
        return currentHour
    }

    //% block="現在は %target 時" target.min=6 target.max=23 target.defl=18 group="状態を調べる"
    export function isHour(target: number): boolean {
        return currentHour === target
    }

    //% block="蓄電池の残量（％）" group="状態を調べる"
    export function battery(): number {
        return batteryPercent
    }

    //% block="蓄電池の残量が %target ％以上" target.min=0 target.max=100 target.defl=50 group="状態を調べる"
    export function batteryAtLeast(target: number): boolean {
        return batteryPercent >= target
    }

    //% block="蓄電池の残量が %target ％未満" target.min=0 target.max=100 target.defl=20 group="状態を調べる"
    export function batteryBelow(target: number): boolean {
        return batteryPercent >= 0 && batteryPercent < target
    }
    //% block="%device %number がオンになっている" number.defl=SmartNumber.N1 group="状態を調べる"
    export function isOn(device: SmartDevice, number: SmartNumber): boolean {
        if (deviceStates.length !== 44) return false
        const bit = number - 1
        const digit = deviceStates.charAt(device * 4 + 3 - Math.floor(bit / 4))
        const value = "0123456789abcdef".indexOf(digit)
        return value >= 0 && (value & (1 << (bit % 4))) !== 0
    }

    //% block="照明 %number がついたとき" number.defl=SmartNumber.N1 group="状態を調べる"
    export function onLightTurnedOn(number: SmartNumber, handler: () => void): void {
        let received = deviceStates.length === 44
        let wasOn = isOn(SmartDevice.Light, number)
        basic.forever(function () {
            if (deviceStates.length === 44) {
                const on = isOn(SmartDevice.Light, number)
                const turnedOn = received && on && !wasOn
                received = true
                wasOn = on
                if (turnedOn) handler()
            }
            basic.pause(20)
        })
    }

    //% block="家全体の消費電力（W）" group="状態を調べる"
    export function consumptionWatts(): number {
        return homePower
    }

    //% block="家全体の消費電力が %watts W以上" watts.defl=500 group="状態を調べる"
    export function powerAtLeast(watts: number): boolean {
        return homePower >= 0 && homePower >= watts
    }
}
