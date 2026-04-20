(function attachDragOrderModule() {
  const namespace = (window.PackTracker = window.PackTracker || {});

  /**
   * Enables drag-to-reorder on a list container.
   *
   * @param {HTMLElement} container - The element whose direct children are draggable.
   * @param {(fromIndex: number, toIndex: number) => void} onReorder
   *   Called with the old and new index whenever a drop completes.
   * @returns {{ destroy: () => void }} Cleanup handle.
   */
  function enableDragOrder(container, onReorder) {
    let draggedEl = null;
    let draggedIndex = -1;
    let placeholderEl = null;

    function getItems() {
      return Array.from(container.children).filter(
        (child) => child.nodeType === 1 && child.hasAttribute("data-drag-item")
      );
    }

    function createPlaceholder(height) {
      const element = document.createElement("div");
      element.className = "drag-placeholder";
      element.style.height = `${height}px`;
      return element;
    }

    function onDragStart(event) {
      draggedEl = event.currentTarget;
      draggedIndex = getItems().indexOf(draggedEl);
      draggedEl.classList.add("is-dragging");

      placeholderEl = createPlaceholder(draggedEl.offsetHeight);
      draggedEl.after(placeholderEl);

      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
      }

      window.requestAnimationFrame(() => {
        if (draggedEl) {
          draggedEl.style.opacity = "0.4";
        }
      });
    }

    function onDragOver(event) {
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "move";
      }

      const target = event.target instanceof Element
        ? event.target.closest("[data-drag-item]")
        : null;
      if (!target || target === draggedEl || target === placeholderEl) {
        return;
      }

      const rect = target.getBoundingClientRect();
      const midpoint = rect.top + (rect.height / 2);
      if (event.clientY < midpoint) {
        container.insertBefore(placeholderEl, target);
      } else {
        target.after(placeholderEl);
      }
    }

    function onDrop(event) {
      event.preventDefault();
      if (!draggedEl || !placeholderEl) {
        return;
      }

      container.insertBefore(draggedEl, placeholderEl);
      placeholderEl.remove();
      placeholderEl = null;

      const newIndex = getItems().indexOf(draggedEl);
      if (newIndex !== draggedIndex) {
        onReorder(draggedIndex, newIndex);
      }

      cleanup();
    }

    function onDragEnd() {
      if (placeholderEl) {
        placeholderEl.remove();
        placeholderEl = null;
      }
      cleanup();
    }

    function cleanup() {
      if (draggedEl) {
        draggedEl.classList.remove("is-dragging");
        draggedEl.style.opacity = "";
      }
      draggedEl = null;
      draggedIndex = -1;
    }

    function attachToItem(element) {
      element.setAttribute("draggable", "true");
      element.addEventListener("dragstart", onDragStart);
      element.addEventListener("dragend", onDragEnd);
    }

    function detachFromItem(element) {
      element.removeAttribute("draggable");
      element.removeEventListener("dragstart", onDragStart);
      element.removeEventListener("dragend", onDragEnd);
    }

    container.addEventListener("dragover", onDragOver);
    container.addEventListener("drop", onDrop);

    getItems().forEach((item) => {
      attachToItem(item);
    });

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1 && node.hasAttribute("data-drag-item")) {
            attachToItem(node);
          }
        });
      });
    });
    observer.observe(container, { childList: true });

    return {
      destroy() {
        observer.disconnect();
        container.removeEventListener("dragover", onDragOver);
        container.removeEventListener("drop", onDrop);
        getItems().forEach((item) => {
          detachFromItem(item);
        });
      },
    };
  }

  Object.assign(namespace, { enableDragOrder });
})();
