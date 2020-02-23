
class Compile {
  constructor(el, vm) {
    // 判断el类型，得到dom对象
    this.el = this.isElementNode(el) ? el : document.querySelector(el)
    // 保存MVVM实例对象
    this.vm = vm
    // 获取文档碎片对象，存放内存中减少重绘和回流
    const fragment = this.node2Frament(this.el)
    // 编译模板
    this.compile(fragment)
    // 添加到根元素上
    this.el.appendChild(fragment)
  }
  // 判断元素节点
  isElementNode (node) {
    return node.nodeType === 1
  }
  // 文档碎片对象
  node2Frament (el) {
    // 创建文档碎片对象
    const f = document.createDocumentFragment()

    let firstChild
    // 将dom对象中的节点以此添加到f文档碎片对象
    while (firstChild = el.firstChild) {
      f.appendChild(firstChild)
    }
    return f
  }
  // 编译模板
  compile (fragment) {
    // 获取子节点
    var childNodes = fragment.childNodes
    // 转换数组遍历
    childNodes = [...childNodes]
    childNodes.forEach((child) => {
      // 元素节点
      if (child.nodeType === 1) {
        // 处理元素节点
        this.compileElement(child)
      } else {
        // 处理文本文本节点
        this.compileText(child)
      }
      // 元素节点是否有子节点
      if (child.childNodes && child.childNodes.length) {
        // 递归
        this.compile(child)
      }
    })
  }
  // 处理文本节点
  compileText (node) {
    // 获取文本信息
    var content = node.textContent
    const rgb = /\{\{(.+?)\}\}/
    // 如果有{{}}表达式
    if (rgb.test(content)) {
      // 编译内容
      compileUtil['text'](node, content, this.vm)
    }
  }
  // 处理元素节点
  compileElement (node) {
    // 获取元素上属性
    var attributes = node.attributes
    attributes = [...attributes]
    // 遍历属性
    attributes.forEach((attr) => {
      // 解构赋值获取属性名属性值
      const { name, value } = attr;
      // 判断属性名是否v-开头
      if (this.isDirective(name)) {
        //  分割字符串
        const [, dirctive] = name.split('-')
        // dirname 为html text等，eventName为事件名
        const [dirName, eventName] = dirctive.split(':')
        // 跟新数据 数据驱动视图
        compileUtil[dirName](node, value, this.vm, eventName)
        // 删除标签上的属性
        node.removeAttribute('v-' + dirctive)
      } else if (this.isEventive(name)) {             //@开头的事件
        let [, eventName] = name.split('@')
        compileUtil['on'](node, value, this.vm, eventName)
        node.removeAttribute('@' + eventName)
      }
    })
  }
  isDirective (attrName) {
    return attrName.startsWith('v-')
  }
  isEventive (eventName) {
    return eventName.startsWith('@')
  }
}


class MVVM {
  constructor(options) {
    this.$el = options.el
    this.$data = options.data
    this.$options = options
    if (this.$el) {
      // 实现一个数据观察者
      new Observer(this.$data)
      // 编译模板
      new Compile(this.$el, this)
      // 代理
      this.proxyData(this.$data)
    }
  }
  proxyData (data) {
    Object.keys(data).forEach(key => {
      Object.defineProperty(this, key, {
        get () {
          return data[key]
        },
        set (newVal) {
          data[key] = newVal
        }
      })
    })
  }
}

const compileUtil = {
  // 获取data属性中的值
  getVal (expr, vm) {
    let value = vm.$data
    expr.split('.').forEach(item => {
      value = value[item]
    })
    return value
  },
  // 获取{{}}表达式的值
  getContentVal (expr, vm) {
    value = expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
      return this.getVal(args[1], vm)
    })
    return value
  },
  // 编译文本节点，替换{{}}内容
  text (node, expr, vm) {
    let value;
    console.log(expr)
    // 是否有多个{{}}
    if (expr.indexOf('{{') !== -1) {
      console.log(expr, 1)
      value = expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
        new watcher(vm, args[1], () => {
          updater.textUpdater(node, this.getContentVal(expr, vm))
        })
        return this.getVal(args[1], vm)
      })
    } else {
      console.log(expr)
      value = this.getVal(expr, vm)
    }
    updater.textUpdater(node, value)
  },
  html (node, expr, vm) {
    const value = this.getVal(expr, vm)
    new watcher(vm, expr, (newVal) => {
      updater.htmlUpdater(node, newVal)
    })
    updater.htmlUpdater(node, value)
  },
  model (node, expr, vm) {
    const value = this.getVal(expr, vm)
    new watcher(vm, expr, (newVal) => {
      this.updater.modelUpdater(node, newVal)
    })
    this.updater.modelUpdater(node, value)
  },
  on (node, expr, vm, eventName) {
    let fn = vm.$options.methods[expr]
    node.addEventListener(eventName, fn, false)
  },
}
// 更新函数
const updater = {
  textUpdater (node, value) {
    node.textContent = value
  },
  htmlUpdater (node, value) {
    node.innerHTML = value
  },
  modelUpdater (node, value) {
    node.value = value
  }
}