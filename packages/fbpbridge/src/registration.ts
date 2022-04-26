import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

const yamlPath = path.resolve(__dirname, '..', 'registration.yaml');
const yamlStr = fs.readFileSync(yamlPath).toString();
const registration = yaml.parse(yamlStr);

export default registration;

// console.log(JSON.stringify(registration, null, 2));