module.exports.cron = {
    fetchAndUpdateBloodBanks: {
        schedule: '00 00 01 * * 06',
        onTick: async () => {
            const countData = await RequestService.queryHereDataLayer('count');
            const totalData = countData?.count;
            for (i = 0; i <= totalData; i += 1000) {
                const result = await RequestService.queryHereDataLayer('iterate', `&handle=${i}`);
                if (result?.features?.length > 0) {
                    for (const feature of result.features) {
                        if (feature?.properties?.categories?.length > 0) {
                            if (_.includes(feature.properties.categories, "800-8000-0367")) {
                                const data = {
                                    name: feature?.properties?.names[0]?.name,
                                    country: "South Africa",
                                    countryCoordinates: { lat: -29, long: 24 },
                                    location: feature?.properties?.names[0]?.name,
                                    locationCoordinates: feature?.geometry?.coordinates,
                                    contacts: feature?.properties?.contacts,
                                    hereId: feature?.id,
                                    type: "here"
                                }
                                const bloodBank = await BloodBank.update({ hereId: data.hereId }).set(data).fetch();
                                if (!bloodBank.length) {
                                    await BloodBank.create(data);
                                }
                            }
                        }
                    }
                }
            }
            console.log({ message: 'Blood Bank updated successfully', data: true });
        }
    },
};