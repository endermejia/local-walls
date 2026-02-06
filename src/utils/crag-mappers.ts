import {
  AmountByEveryGrade,
  CragDetail,
  CragWithJoins,
  TopoListItem,
  VERTICAL_LIFE_GRADES,
} from '../models';

export function mapCragToDetail(rawData: CragWithJoins): CragDetail {
  const parkings =
    rawData.crag_parkings?.map((cp) => cp.parking).filter(Boolean) ?? [];

  const topos: TopoListItem[] =
    rawData.topos?.map((t) => {
      const grades: AmountByEveryGrade = {};
      t.topo_routes.forEach((tr) => {
        const g = tr.route?.grade;
        if (g !== undefined && g !== null) {
          grades[g as VERTICAL_LIFE_GRADES] =
            (grades[g as VERTICAL_LIFE_GRADES] ?? 0) + 1;
        }
      });

      return {
        id: t.id,
        name: t.name,
        slug: t.slug,
        photo: t.photo,
        grades,
        shade_afternoon: t.shade_afternoon,
        shade_change_hour: t.shade_change_hour,
        shade_morning: t.shade_morning,
      };
    }) ?? [];

  const topos_count = topos.length;
  const shade_morning = topos.some((t) => t.shade_morning);
  const shade_afternoon = topos.some((t) => t.shade_afternoon);
  const shade_all_day = topos.some((t) => t.shade_morning && t.shade_afternoon);
  const sun_all_day = topos.some((t) => !t.shade_morning && !t.shade_afternoon);

  return {
    id: rawData.id,
    name: rawData.name,
    slug: rawData.slug,
    area_id: rawData.area_id,
    description_en: rawData.description_en ?? undefined,
    description_es: rawData.description_es ?? undefined,
    warning_en: rawData.warning_en ?? undefined,
    warning_es: rawData.warning_es ?? undefined,
    latitude: rawData.latitude ?? 0,
    longitude: rawData.longitude ?? 0,
    approach: rawData.approach ?? undefined,

    area_name: rawData.area?.name ?? '',
    area_slug: rawData.area?.slug ?? '',
    grades: {},
    liked: (rawData.liked?.length ?? 0) > 0,
    parkings,
    topos,

    user_creator_id: rawData.user_creator_id ?? '',
    created_at: rawData.created_at,

    climbing_kind: [],
    topos_count,
    shade_morning,
    shade_afternoon,
    shade_all_day,
    sun_all_day,
  };
}
