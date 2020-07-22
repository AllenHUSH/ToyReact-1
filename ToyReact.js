// 实DOM
let childrenSymbol = Symbol('children');
class ElementWrapper {
  constructor(type) {
    this.type = type;
    this.props = Object.create(null);
    this[childrenSymbol] = [];
    this.children = [];
  }

  setAttribute(name, value) {
    this.props[name] = value;
  }

  appendChild(vchild) {
    this[childrenSymbol].push(vchild);
    this.children.push(vchild);
  }

  get vdom() {
    return this;
  }

  mountTo(range) {
    this.range = range;
    range.deleteContents();

    let element = document.createElement(this.type);
    for (let name in this.props) {
      if (name.match(/^on([\s\S]+)$/)) {
        const eventName = RegExp.$1.replace(/^[\s\S]/, s => s.toLowerCase());
        element.addEventListener(eventName, this.props[name]);
      } else if (name === 'className') {
        element.setAttribute('class', this.props[name]);
      } else {
        element.setAttribute(name, this.props[name]);
      }
    }

    for (let child of this.children) {
      let range = document.createRange();
      if (element.children.length) {
        range.setStartAfter(element.lastChild);
        range.setEndAfter(element.lastChild);
      } else {
        range.setStart(element, 0);
        range.setEnd(element, 0);
      }
      child.mountTo(range);
    }
    
    range.insertNode(element);
  }
}
// 实DOM
class TextWrapper {
  constructor(content) {
    this.root = document.createTextNode(content);
    this.type = '#text';
    this.children = [];
    this.props = Object.create(null);
  }

  get vdom() {
    return this;
  }
  
  mountTo(range) {
    this.range = range;
    range.deleteContents();
    range.insertNode(this.root);
  }
}

// 虚DOM
export class Component {
  constructor(type) {
    this.children = [];
    this.props = Object.create(null);
  }

  get type() {
    return this.constructor.name;
  }

  get vdom() {
    return this.render().vdom;
  }

  setAttribute(name, value) {
    this.props[name] = value;
    this[name] = value;
  }

  appendChild(child) {
    this.children.push(child);
  }

  update() {
    let vdom = this.vdom;
    if (this.oldVdom) {
      let isSameNode = (node1, node2) => {
        if (!node1 || !node2) return;
        if (node1.type !== node2.type) {
          return false;
        }
        for (let name in node1.props) {
          if (typeof node1.props[name] === 'function' && typeof node2.props[name] === 'function' && node1.props[name].toString() === node2.props[name].toString()) {
            continue;
          }
          if (typeof node1.props[name] === 'object' && typeof node2.props[name] === 'object' && JSON.stringify(node1.props[name]) === JSON.stringify(node2.props[name])) {
            continue;
          }
          if (node1.props[name] !== node2.props[name]) {
            return false;
          }
        }
        if (Object.keys(node1.props).length !== Object.keys(node2.props).length) {
          return false;
        }
        return true;
      }

      let isSameTree = (node1, node2) => {
        if (!isSameNode(node1, node2)) {
          return false;
        }
        if (node1.children.length !== node2.children.length) {
          return false;
        }
        for (let i = 0; i < node1.children.length; i++) {
          if (!isSameTree(node1.children[i], node2.children[i])) {
            return false;
          }
        }
        return true;
      }

      let replace = (newTree, oldTree) => {
        if (isSameTree(oldTree, newTree)) {
          return;
        }
        if (!isSameNode(oldTree, newTree)) {
          newTree.mountTo(oldTree.range);
        } else {
          for (let i = 0; i < newTree.children.length; i++) {
            replace(newTree.children[i], oldTree.children[i]);
          }
        }
      }

      replace(vdom, this.oldVdom);
    } else {
      vdom.mountTo(this.range);
    }
    this.oldVdom = vdom;
  }

  setState(state) {
    let merge = (oldState, newState) => {
      for (let p in newState) {
        if (typeof newState[p] === 'object' && newState[p] !== null) {
          if (typeof oldState[p] !== 'object') {
            if (newState[p] instanceof Array) {
              oldState[p] = [];
            } else {
              oldState[p] = {};
            }
          }
          merge(oldState[p], newState[p]);
        } else {
          oldState[p] = newState[p];
        }
      }
    };
    if (!this.state && state) {
      this.state = {};
    }
    merge(this.state, state);
    this.update();
  }

  mountTo(range) {
    this.range = range;
    this.update();
  }
}

export let ToyReact = {
  createElement(type, attributes, ...children) {
    let element;
    if (typeof type === 'string') {
      element = new ElementWrapper(type);
    } else {
      element = new type;
    }
    for (let name in attributes) {
      element.setAttribute(name, attributes[name]);
    }
    let insertChildren = (children) => {
      for (let child of children) {
        if (typeof child === 'object' && child instanceof Array) {
          insertChildren(child);
        } else {
          if (child === null || child === void 0) {
            child = '';
          }
          if (!(child instanceof Component)
          && !(child instanceof TextWrapper)
          && !(child instanceof ElementWrapper)
          ) {
            child = String(child);
          }
          if (typeof child === 'string') {
            child = new TextWrapper(child);
          }
          element.appendChild(child);
        }
      }
    }
    insertChildren(children);
    return element;
  },
  render(vdom, element) {
    let range = document.createRange();
    if (element.children.length) {
      range.setStartAfter(element.lastChild);
      range.setEndAfter(element.lastChild);
    } else {
      range.setStart(element, 0);
      range.setEnd(element, 0);
    }
    vdom.mountTo(range);
  },
}
