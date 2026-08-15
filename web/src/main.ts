import { mount } from "svelte";

import App from "./App.svelte";
import "./app.css";

const target = document.querySelector("#root");
if (!target) throw new Error("#root를 찾지 못했습니다");

export default mount(App, { target });
