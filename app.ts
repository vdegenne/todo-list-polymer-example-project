import { LitElement, customElement, html, property, css, query } from "lit-element";
import { unsafeHTML } from "lit-html/directives/unsafe-html";
import '@material/mwc-checkbox'
import '@material/mwc-formfield'
import '@material/mwc-icon'
import '@material/mwc-icon-button'
import '@material/mwc-button'
import '@material/mwc-dialog'
import '@material/mwc-textfield'
import { Dialog } from "@material/mwc-dialog";

import { validateForm, resetForm } from '@vdegenne/mwc-forms-util'
import { TextField } from "@material/mwc-textfield";

declare interface Todo {
  name: string
  checked: boolean
}

@customElement('todo-list')
export class TodoList extends LitElement {

  @property({ type: Object }) protected list: Todo[] = [];

  @property() dialogAction: 'add' | 'update';
  @property() todoToUpdate: Todo;

  @query('mwc-dialog') dialog: Dialog;
  @query('mwc-dialog > form') form: HTMLFormElement;

  constructor() {
    super();
    this.loadTodos()
  }

  protected loadTodos() {
    const todos = localStorage.getItem('todos')
    if (todos) {
      this.list = JSON.parse(todos.toString())
    }
    else {
      // default
      this.list = [{
        name: 'my first todo (https://www.google.com)',
        checked: false
      }]
    }
  }

  public static styles = [
    css`
    :host {
      --mdc-theme-primary: black;
    }
    .todo {
      display: flex;
      align-items: center;
      padding: 3px 5px 3px;
    }
    .todo:hover {
      /* background-color: #eeeeee; */
    }
    .todo > .name {
      flex:1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .todo > .name[checked] {
      text-decoration: line-through;
    }

    .todo > mwc-icon {
      /* margin: 0 3px; */
      cursor: pointer;
      user-select: none;
    }

    mwc-icon-button {
      --mdc-icon-button-size: 28px;
      --mdc-icon-size: 18px;
    }
    `
  ]

  protected render() {
    return html`
    ${this.list.map(todo => {
      // transform the urls
      const name = todo.name.replace(/https?:\/\/[^)\] ]+/g, function (match) {
        return `<a href="${match}" target="_blank">${match}</a>`
      });

      return html`
      <div class="todo">
        <mwc-checkbox @click=${() => this.onCheckboxClick(todo)} ?checked=${todo.checked}></mwc-checkbox>
        <div class="name" ?checked=${todo.checked}>${unsafeHTML(name)}</div>
        <mwc-icon-button @click=${() => this.openUpdateDialog(todo)} icon=edit></mwc-icon-button>
        <mwc-icon-button icon="arrow_upward" @click="${() => this.onClickArrowUp(todo)}"></mwc-icon-button>
        <mwc-icon-button icon="arrow_downward" @click=${() => this.onClickArrowDown(todo)}></mwc-icon-button>
        <mwc-icon-button icon="delete" @click=${() => this.onDeleteClick(todo)}></mwc-icon-button>
      </div>`
    })} 

    <mwc-button raised icon="add" style="display:inline-block;margin:20px" @click=${this.openInsertDialog}>add a todo</mwc-button>


    <mwc-dialog heading="${this.dialogAction} todo">
      <form>
        <mwc-textfield label="name *" dialogInitialFocus></mwc-textfield>
      </form>

      <mwc-button slot="secondaryAction" dialogAction=cancel>cancel</mwc-button>
      <mwc-button slot="primaryAction" @click=${this.onDialogAccept}>${this.dialogAction}</mwc-button>
    </mwc-dialog>
    `
  }

  protected openInsertDialog() {
    this.dialogAction = 'add';
    this.dialog.open = true;
  }
  protected openUpdateDialog(todo: Todo) {
    const input = this.form.querySelector('[label="name *"]') as TextField;
    input.value = todo.name;
    this.todoToUpdate = todo;
    this.dialogAction = 'update'
    this.dialog.open = true;
  }

  protected onDialogAccept() {
    const input = this.form.querySelector('mwc-textfield[label="name *"]') as TextField
    // validate
    if (input.value === '') {
      input.setCustomValidity('required')
      input.focus()
      input.reportValidity()
      return;
    }


    switch (this.dialogAction) {
      case 'add':
        this.list.push({
          name: input.value,
          checked: false
        });
        this.saveTodos();
        this.requestUpdate()
        break;
      case 'update':
        this.todoToUpdate.name = input.value
        this.saveTodos()
        this.requestUpdate()
        break
    }

    // close and reset form
    this.dialog.close();
    input.value = ''
    input.setCustomValidity('')
  }

  protected onClickArrowUp(todo: Todo) {
    let index
    if ((index = this.list.indexOf(todo)) !== 0) {
      const replaceWith = this.list[index - 1]
      this.list[index - 1] = todo
      this.list[index] = replaceWith
      this.requestUpdate()
      this.saveTodos()
    }
  }
  protected onClickArrowDown(todo: Todo) {
    let index
    if ((index = this.list.indexOf(todo)) !== this.list.length - 1) {
      const replaceWith = this.list[this.list.length - 1]
      this.list[this.list.length - 1] = todo
      this.list[index] = replaceWith
      this.requestUpdate()
      this.saveTodos()
    }
  }

  protected onDeleteClick(todo: Todo) {
    const accept = confirm('are you sure to delete this todo ?')
    if (accept) {
      this.list.splice(this.list.indexOf(todo), 1)
      this.requestUpdate()
      this.saveTodos()
    }
  }

  protected onCheckboxClick(todo: Todo) {
    todo.checked = !todo.checked
    this.requestUpdate()
    this.saveTodos()
  }


  protected saveTodos() {
    localStorage.setItem('todos', JSON.stringify(this.list))
  }
}