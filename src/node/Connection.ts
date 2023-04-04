/*
    astron.libts
    Copyright (c) 2023, Max Rodriguez. All rights reserved.

    All use of this software is subject to the terms of the revised BSD
    license. You should have received a copy of this license along
    with this source code in a file named "LICENSE."
*/

import { MODULE_DEBUG_FLAGS, MD_PORT } from './globals'
import { Datagram } from './Datagram'
import * as error from './Errors'
import { Buffer } from 'node:buffer'
import * as net from 'node:net'

const DATAGRAM_HEADER_SIZE: number = 2 // bytes

export class Connection {
    protected _DEBUG_: boolean = MODULE_DEBUG_FLAGS.CONNECTION
    protected readonly host: string
    protected readonly port: number
    protected connected: boolean = false
    private socket: net.Socket
    private data_buffer: Buffer = Buffer.alloc(0)
    private receiving: boolean = false

    constructor(host: string = "127.0.0.1", port: number = MD_PORT) {
        this.host = host; this.port = port;
        this.socket = new net.Socket()

        this.socket.on('connect', () => {
            this.connected = true
            this.notify("TCP socket connected!")
        })
        this.socket.on('data', (data: Buffer) => {
            if (data.length > 0) // add bytes received to the data buffer
                this.data_buffer = Buffer.concat([this.data_buffer, data])

            if (this.data_buffer.length > 0) return
            // check if we still have more to add to our data buffer
            let dg_size: number = this.data_buffer.readUint16LE(0)
            this.receiving = (this.data_buffer.length - DATAGRAM_HEADER_SIZE) < dg_size
        })
        this.socket.on('error', (err: Error) => {
            if (err.message.includes('ECONNREFUSED'))
                throw new error.AstronConnectionRefused // throw our own error message
            else
                throw err // not handled, throw it
        })
        this.socket.connect({port: this.port, host: this.host})
    }

    public poll_datagram(): Datagram | null {
        /*  If the socket has finished receiving all the data,
            it will be stored into a Datagram object and returned.
            If we're still receiving data, this method returns null.
        */
        if (!this.receiving) return null
        let dg: Datagram = new Datagram()
        dg.add_data([this.data_buffer])
        this.data_buffer = Buffer.alloc(0) // empty buffer
        this.receiving = false
        return dg
    }

    public send_datagram(dg: Datagram): void {
        try {
            let send_buffer: Buffer
            let dg_size_uint16: Buffer = Buffer.alloc(DATAGRAM_HEADER_SIZE)
            dg_size_uint16.writeUint16LE(dg.get_dg_size())
            send_buffer = Buffer.concat([dg_size_uint16, dg.get_dg_buffer()])
            this.socket.write(send_buffer)
        } catch (err) {
            throw err // doesn't need to be handled; throw
        }
    }

    public disconnect(): void {
        this.socket.destroy()
        this.connected = false
        this.notify("TCP socket connection closed!")
    }
    public is_connected(): boolean {
        return this.connected
    }

    protected notify(msg: string): void {
        if (!this._DEBUG_) return
        console.log(`${this.constructor.name}: ${msg}`)
    }
}
