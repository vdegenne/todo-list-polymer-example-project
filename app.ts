import { LitElement, customElement, html, property, css, query } from "lit-element";
import { unsafeHTML } from "lit-html/directives/unsafe-html";
import '@material/mwc-checkbox'
import '@material/mwc-formfield'
import '@material/mwc-icon'
import '@material/mwc-icon-button'
import '@material/mwc-button'
import '@material/mwc-dialog'
import '@material/mwc-textfield'
import '@material/mwc-snackbar'
import { Dialog } from "@material/mwc-dialog";
import clipboard from "@vdegenne/clipboard-copy";
import '@material/mwc-textarea';

import { TextField } from "@material/mwc-textfield";
import { Snackbar } from "@material/mwc-snackbar";
import { TextArea } from "@material/mwc-textarea";

declare interface Todo {
  name: string
  checked: boolean
}

@customElement('todo-list')
export class TodoList extends LitElement {

  @property({ type: Object }) protected list: Todo[] = [];

  @property() dialogAction: 'add' | 'update';
  @property() todoToUpdate: Todo;
  @property({ attribute: false }) protected _selectedTodo: Todo;

  @query('mwc-dialog#todo-dialog') dialog: Dialog;
  @query('mwc-dialog#todo-dialog > form') form: HTMLFormElement;
  // @query('mwc-dialog#import-dialog') importDialog: Dialog
  @query('mwc-snackbar') snackbar: Snackbar;

  constructor() {
    super();
    this.loadTodos()

    window.addEventListener('keydown', (e) => {
      if (this._selectedTodo) {
        if (e.keyCode === 38) {
          this.onClickArrowUp(null, this._selectedTodo)
        }
        if (e.keyCode === 40) {
          this.onClickArrowDown(null, this._selectedTodo)
        }
      }
    });
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
    .todo[selected] {
      background-color: #cccccc;
    }
    .todo > .name {
      flex:1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-left: 5px;
    }
    .todo > .name[checked] {
      text-decoration: line-through;
    }

    .todo > mwc-icon {
      /* margin: 0 3px; */
      cursor: pointer;
      user-select: none;
    }

    #controls {
      display: flex;
      align-items: center;
      margin: 10px;
    }

    mwc-icon-button {
      --mdc-icon-button-size: 28px;
      --mdc-icon-size: 16px;
    }
    `
  ]

  protected render() {
    return html`
    ${this.list.map((todo, i) => {
      // transform the urls
      const name = todo.name.replace(/https?:\/\/[^)\] ]+/g, function (match) {
        return `<a href="${match}" target="_blank">${match}</a>`
      });

      return html`
      <div class="todo" @click=${() => this._selectedTodo = todo} ?selected=${this._selectedTodo && this._selectedTodo === todo}>
        <mwc-checkbox @click=${(e) => this.onCheckboxClick(e, todo)} ?checked=${todo.checked}></mwc-checkbox>
        <div class="name" ?checked=${todo.checked}>${unsafeHTML(name)}</div>
        <mwc-icon-button @click=${() => this.openUpdateDialog(todo)} icon=edit></mwc-icon-button>
        <mwc-icon-button icon="arrow_upward" @click="${(e) => this.onClickArrowUp(e, todo)}"
            ?disabled=${i === 0}></mwc-icon-button>
        <mwc-icon-button icon="arrow_downward" @click=${(e) => this.onClickArrowDown(e, todo)}
            ?disabled=${i === this.list.length - 1}></mwc-icon-button>
        <mwc-icon-button icon="delete" @click=${() => this.onDeleteClick(todo)}></mwc-icon-button>
      </div>`
    })} 

    <div id=controls>
      <mwc-button raised icon="add" style="display:inline-block;margin:20px" @click=${this.openInsertDialog}>add a todo</mwc-button>
      <mwc-button dense icon="check_box_outline_blank" @click=${this.uncheckAll}>uncheck all</mwc-button>
      <mwc-button dense icon="assignment" @click=${this.copyListToClipBoard}>copy list</mwc-button>
      <mwc-button dense icon="system_update_alt" @click=${this.onImportListClick}>import list</mwc-button>
      <!-- <mwc-icon-button icon="check_box_outline_blank"></mwc-icon-button>uncheck all -->
    </div>

    <mwc-snackbar></mwc-snackbar>

    <mwc-dialog heading="${this.dialogAction} todo" id="todo-dialog">
      <form>
        <mwc-textfield label="name *" dialogInitialFocus></mwc-textfield>
      </form>

      <mwc-button slot="secondaryAction" dialogAction=cancel>cancel</mwc-button>
      <mwc-button slot="primaryAction" @click=${this.onDialogAccept}>${this.dialogAction}</mwc-button>
    </mwc-dialog>

    <mwc-dialog heading="Import list" id="import-dialog">
      <mwc-textarea
          label="list"
          rows=10
          helper="one todo per line"
          helperPersistent
          dialogInitialFocus
          @keydown=${(e: KeyboardEvent) => e.stopImmediatePropagation()}     
      ></mwc-textarea>
      <mwc-button slot=secondaryAction dialogAction=cancel>cancel</mwc-button>
      <mwc-button slot=primaryAction @click=${this.onImportDialogAccept}>import</mwc-button>
    </mwc-dialog>
    `
  }

  uncheckAll() {
    this.list.forEach(todo => todo.checked = false)
    this.saveTodos();
    this.requestUpdate()
  }

  copyListToClipBoard() {
    clipboard(this.list.map(todo => todo.name).join('\n'))
    this.snackbar.labelText = 'copied to clipboard'
    this.snackbar.open()
  }

  onImportListClick() {
    const dialog = this.shadowRoot!.querySelector('#import-dialog') as Dialog;
    dialog.open = true;
  }
  protected onImportDialogAccept() {
    const dialog = this.shadowRoot!.querySelector('#import-dialog') as Dialog;
    const input = dialog.querySelector('mwc-textarea') as TextArea;

    // verify the validation
    if (input.value === '') {
      input.setCustomValidity('required')
      input.reportValidity()
      return;
    }

    // else we add the todos in the current list
    this.list = input.value.split('\n').map(line => {
      return {
        name: line,
        checked: false
      }
    });
    this.requestUpdate()
    this.saveTodos()

    // finally we reset and close
    input.value = '';
    input.setCustomValidity('')
    dialog.close()
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

  protected onClickArrowUp(e: MouseEvent | null, todo: Todo) {
    if (e) {
      e.stopPropagation();
    }
    let index
    if ((index = this.list.indexOf(todo)) !== 0) {
      const replaceWith = this.list[index - 1]
      this.list[index - 1] = todo
      this.list[index] = replaceWith
      this._selectedTodo = todo
      this.requestUpdate()
      this.saveTodos()
    }
  }
  protected onClickArrowDown(e: MouseEvent | null, todo: Todo) {
    if (e) {
      e.stopPropagation()
    }
    let index
    if ((index = this.list.indexOf(todo)) !== this.list.length - 1) {
      const replaceWith = this.list[index + 1]
      this.list[index + 1] = todo
      this.list[index] = replaceWith
      this._selectedTodo = todo
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

  protected onCheckboxClick(e: MouseEvent, todo: Todo) {
    e.stopPropagation();
    todo.checked = !todo.checked
    this._selectedTodo = todo;
    this.requestUpdate()
    this.saveTodos()
  }


  protected saveTodos() {
    localStorage.setItem('todos', JSON.stringify(this.list))
  }
}