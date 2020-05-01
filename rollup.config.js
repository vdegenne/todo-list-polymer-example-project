import typescript from "rollup-plugin-typescript";
import { terser } from "rollup-plugin-terser";
import nodeResolve from '@rollup/plugin-node-resolve';


export default {
  input: 'app.ts',
  output: { file: 'app.js', format: 'iife' },
  plugins: [nodeResolve({
    dedupe: ['@material/mwc-icon']
  }), typescript(), terser()]
}