import { Component } from "@angular/core";
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { invoke } from "@tauri-apps/api/tauri";
import { DID, generateKeyPair, sign, verify, anchor } from '@decentralized-identity/ion-tools';

import { save } from '@tauri-apps/api/dialog';

import { writeTextFile, BaseDirectory } from '@tauri-apps/api/fs';
import { dialog, fs } from '@tauri-apps/api';

@Component({
  selector: "app-root",
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.css"],
})
export class AppComponent {
  greetingMessage = "";

  greet(event: SubmitEvent, name: string): void {
    event.preventDefault();

    // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
    invoke<string>("greet", { name }).then((text) => {
      this.greetingMessage = text;
    });
  }

  pretty(json: any) {
    return JSON.stringify(json, null, 2);;
  }

  async generate() {


    let authnKeys = await generateKeyPair();
    let did = new DID({
      content: {
        publicKeys: [
          {
            id: 'key-1',
            type: 'EcdsaSecp256k1VerificationKey2019',
            publicKeyJwk: authnKeys.publicJwk,
            purposes: ['authentication']
          }
        ],
        services: [
          {
            id: 'domain-1',
            type: 'LinkedDomains',
            serviceEndpoint: 'https://foo.example.com'
          }
        ]
      }
    });

    console.log(did);
    console.log(authnKeys);

    let longFormURI = await did.getURI();
    let shortFormURI = await did.getURI('short');

    console.log(longFormURI);
    console.log('');
    console.log(shortFormURI);

    let suffix = await did.getSuffix();
    console.log(suffix);

    let request = await did.generateRequest(0);
    console.log(this.pretty(request));


    let payload = '';
    let key = (await did.getOperation(0)).update.privateJwk;

    let jws = await sign({
      privateJwk: key,
      payload: payload
    });

    let valid = await verify({
      publicJwk: key,
      jws: jws
    });

    console.log('SECP256K1 JWS verification successful:', valid);
    console.log(jws);


    // Store the key material and source data of all operations that have been created for the DID
    let ionOps = await did.getAllOperations();

    const result = await dialog.open({ directory: true });

    const content = JSON.stringify({ ops: ionOps });

    const options = { path: result + '/ion-did-ops-v1.json', contents: content };
    await fs.writeFile(options);

    // const filePath = await save({
    //   filters: [{
    //     name: 'Identity',
    //     extensions: ['json']
    //   }]
    // });

    // // Write a text file to the `$APPCONFIG/app.conf` path
    // await writeTextFile('ion-did-ops-v1.json',), { dir: BaseDirectory.AppConfig });

    // await writeFile('./ion-did-ops-v1.json', JSON.stringify({ ops: ionOps }));

    // await anchor(request);

  }
}
