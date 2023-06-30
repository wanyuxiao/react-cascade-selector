import React, { useEffect, useMemo, useState } from 'react'
import './index.less'

type Nodes = Array<{ code: string; name: string; children?: Nodes }>
type Node = { code: string; name: string; children?: Nodes }
export type Option = { code: string; name: string; [key: string]: any }
export type Value = Nodes

const MIN_DEPTH = 1

type CommonPopupProps = {
  type: 'single' | 'multi'
  depth: number
  index: number
  visible: boolean
  options: Array<{ key: string; row: Array<Option> }>
  path: Array<{ code: string; name: string }>
  selectedNodes: Array<Node>
  optionClickHandler?: (option: Option, index: number) => void
  backHandler?: (index: number) => void
}
const CommonPopup = ({
  type = 'multi',
  depth = MIN_DEPTH,
  index = 0,
  visible = false,
  options = [],
  path = [],
  selectedNodes = [],
  optionClickHandler,
  backHandler,
}: CommonPopupProps) => {
  return (
    <div className={`CommonPopup ${visible ? 'show' : 'hide'}`}>
      {index > 0 && (
        <div className='title'>
          <div
            className='action'
            onClick={() => {
              backHandler?.(index)
            }}
          >
            返回
          </div>
          {path[index - 1]?.name && (
            <div className='text'>{path[index - 1]?.name}</div>
          )}
        </div>
      )}
      {options.map((g, i) => (
        <div key={i} className='group'>
          <div id={g.key} className='target'>
            {g.key}
          </div>
          <div className='list'>
            {g.row.map((o) => {
              const selected =
                selectedNodes.findIndex((n) => n.code === o.code) > -1
              const selecting = path.findIndex((p) => p.code === o.code) > -1
              return (
                <div
                  key={o.code}
                  className='item'
                  onClick={() => {
                    optionClickHandler?.(o, index)
                  }}
                >
                  {type === 'multi' && index === depth - 1 && (
                    <div
                      className={`icon ${selected ? 'selected' : 'unselected'}`}
                    />
                  )}
                  <div
                    className={`text ${selecting ? 'selecting' : ''} ${
                      selected ? 'selected' : ''
                    }`}
                  >
                    {o.name}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

const clearEmptyChildNodes = (nodes: Nodes): Nodes => {
  nodes.forEach((n) => {
    if (Array.isArray(n.children) && n.children.length > 0) {
      n.children = clearEmptyChildNodes(n.children)
    }
  })
  return nodes.filter(
    (n) => !n.children || (Array.isArray(n.children) && n.children.length > 0),
  )
}
const clearSiblingNodes = (
  nodes: Nodes,
  path: Array<{ code: string; name: string }>,
): Nodes => {
  return nodes.filter((n) => {
    if (Array.isArray(n.children) && n.children.length > 0) {
      n.children = clearSiblingNodes(n.children, path)
    }
    return path.findIndex((p) => p.code === n.code) > -1
  })
}
const clear$$Nodes = (
  nodes: Nodes,
  path: Array<{ code: string; name: string }>,
): Nodes => {
  nodes.forEach((n) => {
    if (path.findIndex((p) => p.code === n.code) > -1) {
      if (Array.isArray(n.children) && n.children.length > 0) {
        n.children = clear$$Nodes(n.children, path)
      }
      nodes = nodes.filter((_n) => _n.code.indexOf('*') < 0)
    }
  })
  return nodes
}
const flattenNodes = (nodes: Nodes): Array<Node> => {
  const flattenedNodes: Array<Node> = []
  nodes.forEach((n) => {
    flattenedNodes.push(n)
    if (Array.isArray(n.children) && n.children.length > 0) {
      flattenedNodes.push(...flattenNodes(n.children))
    }
  })
  return flattenedNodes
}
export type CascadeSelectorProps = {
  type: 'single' | 'multi'
  loadFns: Array<
    (params?: any) => Promise<Array<{ key: string; row: Array<Option> }>>
  >
  initialValue: Value
  confirmHandler?: (value: Value) => void
}
function CascadeSelector({
  type = 'multi',
  loadFns = [],
  initialValue = [],
  confirmHandler: confirmHandlerProp,
}: CascadeSelectorProps) {
  if (!Array.isArray(loadFns) || loadFns.length < MIN_DEPTH) {
    throw new Error(`参数 loadFns 至少有 ${MIN_DEPTH} 个元素`)
  }
  const depth: number = loadFns.length
  const indexes: Array<number> = new Array(depth).fill(0).map((_, i) => i)
  const [visibles, setVisibles] = useState<Array<boolean>>([])
  const [optionss, setOptionss] = useState<
    Array<Array<{ key: string; row: Array<Option> }>>
  >([])
  const [path, setPath] = useState<Array<{ code: string; name: string }>>([])
  const [value, setValue] = useState<Value>(clearEmptyChildNodes(initialValue))
  const flattenedNodes: Array<Node> = useMemo(
    () => flattenNodes(value),
    [value],
  )
  useEffect(() => {
    /* eslint-disable-next-line @typescript-eslint/no-extra-semi */
    ;(async () => {
      const options = await loadFns[0]()
      setOptionss((po) => {
        const currOptionss = [...po]
        currOptionss[0] = options
        return currOptionss
      })
      setVisibles((pv) => {
        const currVisibles = [...pv]
        currVisibles[0] = true
        return currVisibles
      })
    })()
  }, [loadFns])
  useEffect(() => {
    let index = 0
    if (
      type === 'single' &&
      Array.isArray(initialValue) &&
      initialValue.length > 0
    ) {
      const init = async (node: Node) => {
        if (node.code.indexOf('*') > -1) {
          return
        }
        index += 1
        setPath((pp) => {
          const currPath = [...pp]
          currPath[index - 1] = { code: node.code, name: node.name }
          return currPath
        })
        const options = await loadFns[index]()
        setOptionss((po) => {
          const currOptionss = [...po]
          currOptionss[index] = options
          return currOptionss
        })
        setVisibles((pv) => {
          const currVisibles = [...pv]
          currVisibles[index] = true
          return currVisibles
        })
        if (
          index < depth - 1 &&
          Array.isArray(node.children) &&
          node.children.length > 0
        ) {
          init(node.children[0])
        }
      }
      init(initialValue[0])
    }
  }, [type, loadFns, initialValue, depth])
  const select = (_path: Array<{ code: string; name: string }>) => {
    let nextNodes = [...value]
    /* 将 currNodes 和 nextNodes 指向同一个内存地址，currNodes 的指向在递归时发生变化 */
    let currNodes = nextNodes
    _path.forEach((p, i) => {
      // 当前点击的选项是否已选中
      const targetNodeIndex = currNodes.findIndex((n) => n.code === p.code)
      const targetNode = currNodes[targetNodeIndex]
      // 当前点击的选项已选中时，需要进一步判断当前点击的选项是否是叶子节点
      // 注意：各层级的「不限」选项是叶子节点
      if (targetNodeIndex > -1) {
        // 当前点击的选项是叶子节点时，需要进一步判断当前点击的选项是否位于最底层
        // 注意：位于非最底层的「不限」选项在多选时不能取消选择，表现与在单选时相同
        if (i === _path.length - 1) {
          // 当前点击的选项位于最底层时，需要进一步判断当前点击的选项是否为「不限」选项
          if (type === 'multi' && i === depth - 1) {
            // 当前点击的选项为「不限」选项时，该层已选中的选项全部取消选中
            if (targetNode.code.indexOf('*') > -1) {
              currNodes.splice(0, currNodes.length)
            } else {
              // 当前点击的选项为普通选项时，取消选中该选项
              currNodes.splice(targetNodeIndex, 1)
              // 如果该层的「不限」选项已选中，取消选中该层的「不限」选项
              const $$nodeIndex = currNodes.findIndex(
                (n) => n.code.indexOf('*') > -1,
              )
              if ($$nodeIndex > -1) {
                currNodes.splice($$nodeIndex, 1)
              }
            }
            // 及时清理子节点为空的节点
            nextNodes = clearEmptyChildNodes(nextNodes)
          }
        } else {
          // 当前点击的选项是非叶子节点，则下沉一级
          /* 对 targetNode.children 判空，但不能改变 currNodes 的指向，使其指向 targetNode.children 指向的内存地址 */
          targetNode.children = targetNode.children || []
          currNodes = targetNode.children
        }
      } else {
        // 当前点击的选项未选中时，需要进一步判断当前点击的选项是否是叶子节点
        // 注意：各层级的「不限」选项是叶子节点
        // 当前点击的选项是叶子节点时，单选和多选需要分开处理
        if (i === _path.length - 1) {
          // 单选时
          if (type === 'single') {
            // 选中当前点击的选项
            currNodes.push({ code: p.code, name: p.name })
            // 及时清理不在指定路径上的节点
            // 注意：单选时，选项之间是互斥的
            nextNodes = clearSiblingNodes(nextNodes, _path)
            setValue(nextNodes)
            confirmHandler()
            return
          }
          // 多选时，需要进一步判断当前点击的选项是否位于最底层
          // 当前点击的选项位于最底层时，需要进一步判断当前点击的选项是否为「不限」选项
          if (i === depth - 1) {
            // 当前点击的选项为「不限」选项时，该层的选项全部选中
            if (p.code.indexOf('*') > -1) {
              optionss[i].forEach((g) => {
                g.row.forEach((o) => {
                  // 注意：该层已选中的选项需要先取消选中再选中，以保证顺序与数据源的顺序同步
                  const _targetNodeIndex = currNodes.findIndex(
                    (n) => n.code === o.code,
                  )
                  if (_targetNodeIndex > -1) {
                    currNodes.splice(_targetNodeIndex, 1)
                  }
                  currNodes.push({ code: o.code, name: o.name })
                })
              })
            } else {
              // 当前点击的选项为普通选项时，选中该选项
              currNodes.push({ code: p.code, name: p.name })
              // 如果该层的选项全部选中时，选中「不限」选项
              const flattenedOptions = optionss[i].reduce(
                (a: Array<Option>, c) => a.concat(c.row),
                [],
              )
              const $$optionIndex = flattenedOptions.findIndex(
                (o) => o.code.indexOf('*') > -1,
              )
              const $$option = flattenedOptions.splice($$optionIndex, 1)[0]
              if (currNodes.length === flattenedOptions.length) {
                currNodes.push({ code: $$option.code, name: $$option.name })
              }
            }
          } else {
            // 当前点击的选项为位于非最底层的「不限」选项时，该层已选中的选项全部取消选中
            // 注意：位于非最底层的「不限」选项与该层的其它选项之间是互斥的
            currNodes.splice(0, currNodes.length)
            currNodes.push({ code: p.code, name: p.name })
          }
          // 及时清理指定路径上的「不限」选项
          nextNodes = clear$$Nodes(nextNodes, _path.slice(0, _path.length - 1))
        } else {
          /* 给 currNodes 指向的内存地址追加一个节点，访问同一个内存地址的 nextNodes 更新 */
          const node = { code: p.code, name: p.name, children: [] }
          currNodes.push(node)
          /* 将 currNodes 的指向改为 node.children 指向的内存地址 */
          currNodes = node.children
        }
      }
    })
    setValue(nextNodes)
  }
  const optionClickHandler = async (option: Option, index: number) => {
    const currPath = [...path]
    if (index < depth - 1) {
      setVisibles((pv) => {
        const currVisibles = [...pv]
        currVisibles.splice(index + 1, path.length - index)
        return currVisibles
      })
      setOptionss((po) => {
        const currOptionss = [...po]
        currOptionss.splice(index + 1, path.length - index)
        return currOptionss
      })
      currPath.splice(index, path.length - index)
      setPath(currPath)
    }
    if (index === depth - 1 || option.code.indexOf('*') > -1) {
      const _path = currPath.concat({ code: option.code, name: option.name })
      select(_path)
    } else {
      setPath((pp) => [...pp, { code: option.code, name: option.name }])
      const options = await loadFns[index + 1](option.code)
      setOptionss((po) => [...po, options])
      setVisibles((pv) => [...pv, true])
    }
  }
  const backHandler = (index: number) => {
    setVisibles((pv) => {
      const currVisibles = [...pv]
      currVisibles.splice(index, path.length + 1 - index)
      return currVisibles
    })
    setOptionss((po) => {
      const currOptionss = [...po]
      currOptionss.splice(index, path.length + 1 - index)
      return currOptionss
    })
    setPath((pp) => {
      const currPath = [...pp]
      currPath.splice(index - 1, path.length + 1 - index)
      return currPath
    })
  }
  const clearHandler = () => {
    setVisibles((pv) => {
      const currVisibles = [...pv]
      currVisibles.splice(1, path.length + 1 - 1)
      return currVisibles
    })
    setOptionss((po) => {
      const currOptionss = [...po]
      currOptionss.splice(1, path.length + 1 - 1)
      return currOptionss
    })
    setPath((pp) => {
      const currPath = [...pp]
      currPath.splice(0, path.length + 1 - 1)
      return currPath
    })
    setValue([])
  }
  const confirmHandler = () => {
    confirmHandlerProp?.(value)
  }
  const scrollHandler = (key: string) => {
    const element = document.getElementById(key)
    element?.scrollIntoView({ behavior: 'smooth' })
  }
  return (
    <div className='CascadeSelector'>
      <div className={`container ${type}`}>
        {indexes.map((_, i) => (
          <CommonPopup
            key={i}
            type={type}
            depth={depth}
            index={i}
            visible={visibles[i]}
            options={optionss[i]}
            path={path}
            selectedNodes={flattenedNodes}
            optionClickHandler={optionClickHandler}
            backHandler={backHandler}
          />
        ))}
      </div>
      <div className='anchor-bar'>
        {optionss[0]?.map((g, i) => (
          <div
            key={i}
            className='item'
            onClick={() => {
              scrollHandler(g.key)
            }}
          >
            {g.key}
          </div>
        ))}
      </div>
      {type === 'multi' && (
        <div className='footer-bar'>
          <div className='reset-button' onClick={clearHandler}>
            清空
          </div>
          <div className='confirm-button' onClick={confirmHandler}>
            确定
          </div>
        </div>
      )}
    </div>
  )
}

export default CascadeSelector
