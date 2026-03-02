import type { App, StyleValue, Slots, Exposure } from 'vue';
import {
  createApp,
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  PropType,
  ref,
  watch,
} from 'vue';
import MasonrySnapGridLayout from './MasonrySnapGridLayout';
import type { MasonrySnapGridLayoutOptions } from './types';

type LayoutMode = MasonrySnapGridLayoutOptions<any>['layoutMode'];

interface MasonryVueProps<T> extends Omit<MasonrySnapGridLayoutOptions<T>, 'items' | 'renderItem'> {
  items: T[];
  className?: string;
  style?: StyleValue;
}

function createVueMasonryComponent<T>() {
  return defineComponent({
    name: 'MasonrySnapGrid',
    props: {
      items: {
        type: Array as PropType<T[]>,
        required: true,
      },
      gutter: Number,
      minColWidth: Number,
      animate: {
        type: Boolean,
        default: undefined,
      },
      transitionDuration: Number,
      layoutMode: String as PropType<LayoutMode>,
      className: String,
      style: Object as PropType<StyleValue>,
    },
    setup(props: MasonryVueProps<T>, context: { slots: Slots; expose: Exposure }) {
      const { slots, expose } = context;
      const containerRef = ref<HTMLElement | null>(null);
      const layoutRef = ref<MasonrySnapGridLayout<T> | null>(null);
      const apps = new Map<HTMLElement, App>();

      const createLayout = () => {
        const container = containerRef.value;
        if (!container) return;

        const options: MasonrySnapGridLayoutOptions<T> = {
          items: props.items,
          gutter: props.gutter,
          minColWidth: props.minColWidth,
          animate: props.animate,
          transitionDuration: props.transitionDuration,
          layoutMode: props.layoutMode,
          renderItem: (item: T) => {
            const el = document.createElement('div');
            const app = createApp({
              setup() {
                return () =>
                  slots.default
                    ? slots.default({ item })
                    : null;
              },
            });

            app.mount(el);
            apps.set(el, app);
            return el;
          },
        };

        layoutRef.value = new MasonrySnapGridLayout<T>(container, options);
      };

      onMounted(() => {
        createLayout();
      });

      watch(
        () => props.items,
        (items: T[]) => {
          layoutRef.value?.updateItems(items);
        },
      );

      onBeforeUnmount(() => {
        apps.forEach((app, el) => {
          try {
            app.unmount();
            el.remove();
          } catch {
            // ignore
          }
        });
        apps.clear();

        layoutRef.value?.destroy();
        layoutRef.value = null;
      });

      expose({
        layout: layoutRef,
      });

      return () =>
        h('div', {
          ref: containerRef,
          class: props.className,
          style: {
            position: 'relative',
            width: '100%',
            ...(props.style as object | undefined),
          },
        });
    },
  });
}

const MasonrySnapGridVue = createVueMasonryComponent<any>();

export default MasonrySnapGridVue;

