/*
    astron.libts
    Copyright (c) 2023, Max Rodriguez. All rights reserved.

    All use of this software is subject to the terms of the revised BSD
    license. You should have received a copy of this license along
    with this source code in a file named "LICENSE."
*/

import * as astron from './../../'

class Services {
    private repo: astron.InternalRepository

    constructor() {
        this.repo = new astron.InternalRepository({dc_file: 'example.dc', channel: 500000})
        // TODO: implement connect success callback to repo
    }

    private connection_success(): void {
        console.log("Internal Repository connected!")
        while (true) {
            this.repo.poll_until_empty()
        }
    }
}

const app = new Services()